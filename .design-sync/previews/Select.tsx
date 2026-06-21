import { Select } from 'kaitori-saihan-app';
const noop = () => {};

export function PropertyType() {
  return (
    <div className="max-w-xs">
      <Select
        value="building"
        onChange={noop}
        options={[
          { value: 'building', label: '建物リフォーム再販' },
          { value: 'land', label: '土地再販' },
          { value: 'kenuri', label: '建売（新築建売）' },
          { value: 'mansion', label: 'マンション再販' },
        ]}
      />
    </div>
  );
}
export function Company() {
  return (
    <div className="max-w-xs">
      <Select
        value="yukari"
        onChange={noop}
        options={[
          { value: 'yukari', label: 'ゆかり株式会社' },
          { value: 'vivi', label: 'ViVi不動産株式会社' },
        ]}
      />
    </div>
  );
}
