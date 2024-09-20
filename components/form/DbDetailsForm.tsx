import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DbTypeSelector from "@/app/dashboard/_components/dbTypeSelector"; // Adjust path as per your file structure
import { useForm } from "react-hook-form";

// Define validation schema using zod
const schema = z.object({
  connectionName: z.string().min(1, "Connection Name is required"),
  databaseName: z.string().min(1, "Database Name is required"),
  databaseType: z.string().min(1, "Database Type is required"),
  host: z.string().min(1, "Host is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

interface DatabaseDetailsFormProps {
  onSubmit: (formData: FormData) => void; // Define onSubmit as a function that accepts FormData
}

const DatabaseDetailsForm: React.FC<DatabaseDetailsFormProps> = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const submitForm = (formData: FormData) => {
    try {
      // Invoke the onSubmit function passed from props
      onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
      // Handle error if needed
    }
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} autoComplete="off" method="post" className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Connection Name</Label>
          <Input {...register("connectionName")} placeholder="Enter connection name" />
          {errors?.connectionName?.message && (
            <p className="text-red-500 text-sm">{errors.connectionName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Database Name</Label>
          <Input {...register("databaseName")} placeholder="Enter database name" />
          {errors?.databaseName?.message && (
            <p className="text-red-500 text-sm">{errors.databaseName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Database Type</Label>
        {/* Replace select input with DbTypeSelector component */}
        <DbTypeSelector setValue={setValue} />
        {errors?.databaseType?.message && (
          <p className="text-red-500 text-sm">{errors.databaseType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Host</Label>
        <Input {...register("host")} placeholder="Enter host" />
        {errors?.host?.message && <p className="text-red-500 text-sm">{errors.host.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Username</Label>
        <Input {...register("username")} placeholder="Enter username" />
        {errors?.username?.message && (
          <p className="text-red-500 text-sm">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <Input {...register("password")} placeholder="Enter password" type="password" autoComplete="new-password"/>
        {errors?.password?.message && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full font-extrabold" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Connect"}
      </Button>
    </form>
  );
};

export default DatabaseDetailsForm;
