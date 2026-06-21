import { Tabs } from 'kaitori-saihan-app';
const noop = () => {};

export function Default() {
  return (
    <div className="px-4">
      <Tabs
        active="calc"
        onChange={noop}
        tabs={[
          { key: 'calc', label: '計算書' },
          { key: 'ringi', label: '稟議書' },
          { key: 'sim', label: 'シミュレーション' },
          { key: 'plan', label: '事業計画書' },
        ]}
      />
    </div>
  );
}
