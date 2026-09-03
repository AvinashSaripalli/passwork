import { useMemo } from 'react';
import { TYPE_FIELDS } from '../../utils/itemTypes';
import {
  detectCardNetwork,
  luhnCheck,
  validateExpiry,
  validateCVV,
  formatCardNumber,
} from '../../utils/cardValidation';

function ItemFields({ type, values, onChange, inputClass }) {
  const fields = TYPE_FIELDS[type] || [];

  const { errors, network } = useMemo(() => {
    if (type !== 'CARD') {
      return { errors: {}, network: null };
    }

    const cardNumber = values?.cardNumber;
    const expiry = values?.expiry;
    const cvv = values?.cvv;

    const newErrors = {};
    let detectedNetwork = null;

    if (cardNumber) {
      detectedNetwork = detectCardNetwork(cardNumber);
      if (!luhnCheck(cardNumber)) {
        newErrors.cardNumber = 'Invalid card number';
      }
    }

    if (expiry) {
      const result = validateExpiry(expiry);
      if (!result.valid) newErrors.expiry = result.message;
    }

    if (cvv) {
      const result = validateCVV(cvv);
      if (!result.valid) newErrors.cvv = result.message;
    }

    return { errors: newErrors, network: detectedNetwork };
  }, [type, values]);

  if (fields.length === 0) return null;

  const displayValues = { ...values };
  if (type === 'CARD' && network) {
    displayValues.brand = network.name;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((field) => {
        const fieldValue = displayValues?.[field.key] || '';

        const value = field.key === 'cardNumber' && fieldValue
          ? formatCardNumber(fieldValue)
          : fieldValue;

        return (
          <div key={field.key} className="flex flex-col">
            <div className="relative">
              {field.key === 'cardNumber' && network && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400 pointer-events-none">
                  {network.name}
                </span>
              )}
              <input
                type={field.input}
                value={value}
                readOnly={field.readOnly}
                onChange={field.readOnly ? undefined : (e) => {
                  let val = e.target.value;
                  if (field.key === 'cardNumber') {
                    val = val.replace(/[\s-]/g, '');
                  }
                  onChange(field.key, val);
                }}
                placeholder={field.label}
                className={`${inputClass} ${field.key === 'cardNumber' && network ? 'pl-20' : ''} ${errors[field.key] ? 'border-red-400 dark:border-red-500' : ''} ${field.readOnly ? 'bg-slate-50 dark:bg-slate-600 cursor-default' : ''}`}
              />
            </div>
            {errors[field.key] && (
              <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                {errors[field.key]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ItemFields;
