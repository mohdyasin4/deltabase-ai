import { Client as PostgresClient } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

interface DatabaseConfig {
  host: string;
  database: string;
  user: string;
  password: string;
}

// PostgreSQL utilities
export async function connectToPostgres(config: DatabaseConfig): Promise<PostgresClient> {
  const client = new PostgresClient({
    host: config.host,
    database: config.database,
    user: config.user,
    password: config.password,
  });
  await client.connect();
  return client;
}

export async function listPostgresTables(client: PostgresClient): Promise<string[]> {
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  return res.rows.map((row: { table_name: any; }) => row.table_name);
}

export async function listPostgresColumns(client: PostgresClient, tableName: string): Promise<string[]> {
  const res = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
  `, [tableName]);
  return res.rows.map((row: { column_name: any; }) => row.column_name);
}

export async function queryPostgresTable(client: PostgresClient, tableName: string): Promise<any[]> {
  const res = await client.query(`SELECT * FROM ${tableName} LIMIT 100`);
  return res.rows;
}

export async function executePostgresQuery(client: PostgresClient, query: string): Promise<any[]> {
  const res = await client.query(query);
  return res.rows;
}

// MySQL utilities
export async function connectToMySQL(config: DatabaseConfig): Promise<mysql.Connection> {
  const connection = await mysql.createConnection({
    host: config.host,
    database: config.database,
    user: config.user,
    password: config.password,
  });
  return connection;
}

export async function listMySQLTables(connection: mysql.Connection): Promise<string[]> {
  const [rows] = await connection.execute("SHOW TABLES");
  return (rows as any[]).map((row: any) => Object.values(row)[0] as string);
}

export async function listMySQLColumns(connection: mysql.Connection, tableName: string): Promise<string[]> {
  const [rows] = await connection.execute(`SHOW COLUMNS FROM \`${tableName}\``);
  return (rows as any[]).map((row: any) => row.Field);
}

export async function queryMySQLTable(connection: mysql.Connection, tableName: string): Promise<{ columns: string[], rows: any }> {
  const [rows, fields] = await connection.execute(`SELECT * FROM \`${tableName}\` LIMIT 100`);
  const columns = fields.map((field: any) => field.name);
  return { columns, rows };
}

export async function executeMySQLQuery(connection: mysql.Connection, query: string): Promise<any> {
  const [rows] = await connection.execute(query);
  return rows;
}

// MongoDB utilities
export async function connectToMongoDB(config: DatabaseConfig): Promise<{ db: any; client: MongoClient }> {
  const client = new MongoClient(`mongodb://${config.user}:${config.password}@${config.host}/${config.database}`);
  await client.connect();
  const db = client.db(config.database);
  return { db, client };
}

export async function listMongoDBCollections(db: any): Promise<string[]> {
  const collections = await db.listCollections().toArray();
  return collections.map((collection: any) => collection.name);
}

export async function listMongoDBColumns(db: any, collectionName: string): Promise<string[]> {
  const sampleDoc = await db.collection(collectionName).findOne();
  return sampleDoc ? Object.keys(sampleDoc) : [];
}

export async function queryMongoDBCollection(db: any, collectionName: string): Promise<any[]> {
  const collection = db.collection(collectionName);
  const documents = await collection.find().limit(100).toArray();
  return documents;
}

export async function executeMongoDBQuery(db: any, query: string): Promise<any[]> {
  // MongoDB queries are usually more complex and require proper parsing.
  // For the purpose of this example, we assume the query is a JSON string with the collection name and find parameters.
  const { collectionName, findParams } = JSON.parse(query);
  const collection = db.collection(collectionName);
  const documents = await collection.find(findParams).limit(100).toArray();
  return documents;
}
