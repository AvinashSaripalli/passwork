import { CreditCard, KeyRound, Landmark, Shield, StickyNote } from 'lucide-react';
import { getItemTypeMeta } from '../../utils/itemTypes';

const TYPE_ICONS = {
  LOGIN: KeyRound,
  CARD: CreditCard,
  BANK_ACCOUNT: Landmark,
  IDENTITY: Shield,
  SECURE_NOTE: StickyNote,
};

const TYPE_STYLES = {
  LOGIN: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  CARD: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  BANK_ACCOUNT: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  IDENTITY: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  SECURE_NOTE: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

function ItemTypeBadge({ type }) {
  const meta = getItemTypeMeta(type);
  const Icon = TYPE_ICONS[type] || KeyRound;
  const style = TYPE_STYLES[type] || TYPE_STYLES.LOGIN;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${style}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

export default ItemTypeBadge;
