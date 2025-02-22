import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify-icon/react";
import useDatabaseStore from "@/hooks/useDatabaseStore";

interface DbTypeSelectorProps {
  setValue: any; // Adjust type as per your useForm type
}

const DbTypeSelector: React.FC<DbTypeSelectorProps> = ({ setValue }) => {
  const { databaseType, setDatabaseType } = useDatabaseStore();

  const handleDbTypeChange = (value: string) => {
    setValue("databaseType", value); // Sets the value in the form using react-hook-form's setValue
    setDatabaseType(value); // Optional: Updates local state if needed
  };

  return (
    <Select value={databaseType} onValueChange={handleDbTypeChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a Database Type" />
      </SelectTrigger>
      <SelectContent>
          <SelectItem value="postgres">
            <div className="flex items-center">
              <Icon width={24} height={24} className="mr-2" icon="logos:postgresql" />
              PostgreSQL
            </div>
          </SelectItem>
          <SelectItem value="mysql">
            <Icon width={24} height={24} className="mr-2" icon="simple-icons:mysql" />
            MySQL
          </SelectItem>
          <SelectItem value="mongodb">
            <Icon width={24} height={24} className="mr-2" icon="devicon:mongodb" />
            MongoDB
          </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default DbTypeSelector;
