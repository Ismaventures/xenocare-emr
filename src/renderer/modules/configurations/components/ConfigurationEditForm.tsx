import React, { useEffect, useState } from 'react';
import { Button, Textarea } from '../../../components/ui/FormElements';
import { SystemConfigurationDTO } from '../dtos/configurations.dto';

interface ConfigurationEditFormProps {
  config: SystemConfigurationDTO;
  onSubmit: (value: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfigurationEditForm({
  config,
  onSubmit,
  onCancel,
  isLoading,
}: ConfigurationEditFormProps) {
  const [value, setValue] = useState(config.value ?? '');

  useEffect(() => {
    setValue(config.value ?? '');
  }, [config.config_id, config.value]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(value);
      }}
    >
      <div>
        <p className="text-sm text-gray-500">Key</p>
        <p className="font-mono text-sm text-gray-900 break-all">
          {config.key}
        </p>
      </div>
      {config.description && (
        <div>
          <p className="text-sm text-gray-500">Description</p>
          <p className="text-sm text-gray-900">{config.description}</p>
        </div>
      )}
      <Textarea
        label="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={!!isLoading}>
          Save
        </Button>
      </div>
    </form>
  );
}

ConfigurationEditForm.defaultProps = {
  isLoading: false,
};

ConfigurationEditForm.defaultProps = {
  isLoading: false,
};
