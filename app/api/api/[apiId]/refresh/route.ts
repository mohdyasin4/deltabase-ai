import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  connectToPostgres,
  connectToMySQL,
  connectToMongoDB,
} from "@/utils/databaseUtils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { connectionId, tableName, data } = body;

    if (!connectionId || !tableName || !data || data.length === 0) {
      return NextResponse.json(
        { error: "Missing connectionId, tableName, or data" },
        { status: 400 }
      );
    }

    // Verify user has access to this database connection
    const { data: connectionDetails, error: connectionError } = await supabaseClient
      .from("database_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connectionError || !connectionDetails) {
      return NextResponse.json(
        { error: "Invalid database connection or access denied." },
        { status: 403 }
      );
    }

    const {
      database_type: type,
      host,
      database_name: database,
      username: user,
      password,
    } = connectionDetails;

    const primaryKey = "id"; // Customize if your data uses a different primary key

    if (type === "postgres") {
      const client = await connectToPostgres({ host, database, user, password });

      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      const columnDefs = columns.map((key) => `"${key}" TEXT`).join(", ");
      await client.query(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs}, PRIMARY KEY ("${primaryKey}"));`);

      // Delete stale rows
      const incomingIds = data.map((row) => row[primaryKey]);
      await client.query(
        `DELETE FROM "${tableName}" WHERE "${primaryKey}" NOT IN (${incomingIds.map((_, i) => `$${i + 1}`).join(", ")})`,
        incomingIds
      );

      // Upsert new data
      const colNames = columns.map((k) => `"${k}"`).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const updateSet = columns
        .filter((col) => col !== primaryKey)
        .map((col) => `"${col}" = EXCLUDED."${col}"`)
        .join(", ");

      const upsertQuery = `
        INSERT INTO "${tableName}" (${colNames})
        VALUES (${placeholders})
        ON CONFLICT ("${primaryKey}") DO UPDATE SET ${updateSet};
      `;

      for (const row of data) {
        const values = columns.map((key) => row[key]);
        await client.query(upsertQuery, values);
      }

      await client.end();

    } else if (type === "mysql") {
      const connection = await connectToMySQL({ host, database, user, password });

      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      const columnDefs = columns.map((key) => `\`${key}\` TEXT`).join(", ");
      await connection.execute(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnDefs}, PRIMARY KEY (\`${primaryKey}\`));`);

      // Delete stale rows
      const incomingIds = data.map((row) => row[primaryKey]);
      const placeholders = incomingIds.map(() => "?").join(", ");
      await connection.execute(
        `DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` NOT IN (${placeholders})`,
        incomingIds
      );

      // Upsert new data
      const colNames = columns.map((k) => `\`${k}\``).join(", ");
      const valuePlaceholders = columns.map(() => "?").join(", ");
      const updateSet = columns
        .filter((col) => col !== primaryKey)
        .map((col) => `\`${col}\` = VALUES(\`${col}\`)`)
        .join(", ");

      const upsertQuery = `
        INSERT INTO \`${tableName}\` (${colNames})
        VALUES (${valuePlaceholders})
        ON DUPLICATE KEY UPDATE ${updateSet};
      `;

      for (const row of data) {
        const values = columns.map((key) => row[key]);
        await connection.execute(upsertQuery, values);
      }

      await connection.end();

    } else if (type === "mongodb") {
      const { db, client } = await connectToMongoDB({ host, database, user, password });
      const collection = db.collection(tableName);

      const incomingIds = data.map((row) => row[primaryKey]);

      // Delete stale rows
      await collection.deleteMany({ [primaryKey]: { $nin: incomingIds } });

      // Upsert new data
      for (const row of data) {
        await collection.updateOne(
          { [primaryKey]: row[primaryKey] },
          { $set: row },
          { upsert: true }
        );
      }

      await client.close();

    } else {
      return NextResponse.json({ error: "Unsupported database type." }, { status: 400 });
    }

    // Update last_refreshed timestamp
    await supabaseClient
      .from("database_connections")
      .update({ last_refreshed: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json(
      {
        message: "Data refreshed successfully.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
