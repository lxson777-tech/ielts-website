/* The seller's details as a list, for the public offer and the receipt
   (Builder L, 2 October 2026). Every value comes from src/lib/operator.ts
   through sellerRows(); a detail Alex has not filled in shows as a marked
   placeholder in the gated build and not at all on the open site. Values
   are never translated: they are shown exactly as registered. */

import { useT } from '../../lib/i18n/react';
import { sellerRows, SELLER_FULL } from '../../lib/legal/offer';
import type { LegalKey } from '../../lib/operator';
import { isTrialBuild } from '../../lib/trial/mode';
import '../../styles/legal.css';

export function SellerValue({ text, draft, href }: { text: string; draft: boolean; href: string | null }) {
  if (draft) return <span className="legal-draft">{text}</span>;
  return href ? <a href={href}>{text}</a> : <>{text}</>;
}

export default function SellerDetails({ keys = SELLER_FULL, className = 'policy-services legal-seller' }: { keys?: readonly LegalKey[]; className?: string }) {
  const { t } = useT();
  const rows = sellerRows(keys, isTrialBuild());
  if (rows.length === 0) return null;
  return (
    <dl className={className}>
      {rows.map((row) => (
        <div key={row.key}>
          <dt>{t(row.label)}</dt>
          <dd>
            <SellerValue {...row} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
