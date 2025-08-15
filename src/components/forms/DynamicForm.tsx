import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wand2 } from 'lucide-react';
import { BlockField } from '@/lib/types';
import { CodeEditor } from './CodeEditor';

interface DynamicFormProps {
  fields: BlockField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

export function DynamicForm({ fields, values, onChange }: DynamicFormProps) {
  const [localValues, setLocalValues] = useState(values);

  const updateValue = (fieldId: string, value: any) => {
    const newValues = { ...localValues, [fieldId]: value };
    setLocalValues(newValues);
    onChange(newValues);
  };

  const evaluateCondition = (condition: any): boolean => {
    if (typeof condition === 'function') {
      return condition();
    }
    
    if (condition.field) {
      const fieldValue = localValues[condition.field];
      const matches = condition.value === fieldValue;
      return condition.not ? !matches : matches;
    }
    
    return true;
  };

  const renderField = (field: BlockField) => {
    // Check field condition
    if (field.condition && !evaluateCondition(field.condition)) {
      return null;
    }

    const value = localValues[field.id] || '';
    const isFullWidth = field.layout === 'full';

    const fieldContent = (
      <div className={`space-y-2 ${isFullWidth ? 'col-span-2' : ''}`}>
        <div className="flex items-center justify-between">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.title}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {field.wandConfig?.enabled && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Wand2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        {renderFieldInput(field, value)}
      </div>
    );

    return (
      <div key={field.id} className={isFullWidth ? 'col-span-2' : ''}>
        {fieldContent}
      </div>
    );
  };

  const renderFieldInput = (field: BlockField, value: any) => {
    switch (field.type) {
      case 'short-input':
        return (
          <Input
            id={field.id}
            value={value}
            onChange={(e) => updateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            type={field.password ? 'password' : 'text'}
          />
        );

      case 'long-input':
        return (
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => updateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
          />
        );

      case 'code':
        return (
          <CodeEditor
            value={value}
            onChange={(newValue) => updateValue(field.id, newValue)}
            language={field.language || 'javascript'}
            placeholder={field.placeholder}
          />
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <Slider
              value={[value || field.min || 0]}
              onValueChange={([newValue]) => updateValue(field.id, newValue)}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {value || field.min || 0}
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => updateValue(field.id, checked)}
            />
            <Label htmlFor={field.id} className="text-sm">
              {field.placeholder || 'Enable'}
            </Label>
          </div>
        );

      case 'combobox':
        const options = field.options ? field.options() : [];
        return (
          <Select value={value} onValueChange={(newValue) => updateValue(field.id, newValue)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            value={value}
            onChange={(e) => updateValue(field.id, parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      default:
        return (
          <Input
            id={field.id}
            value={value}
            onChange={(e) => updateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map(renderField)}
      </div>
    </Card>
  );
}