import { TYPE_FIELDS } from '../../utils/itemTypes';

function ItemFields({ type, values, onChange, inputClass }) {
  const fields = TYPE_FIELDS[type] || [];

  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((field) => (
        <input
          key={field.key}
          type={field.input}
          value={values?.[field.key] || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.label}
          className={inputClass}
        />
      ))}
    </div>
  );
}

export default ItemFields;
