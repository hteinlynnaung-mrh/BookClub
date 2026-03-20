import { useTranslation } from 'react-i18next';
import { Button } from './ui';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
      <Button
        variant={i18n.language === 'en' ? 'primary' : 'ghost'}
        className="h-7 px-2 text-xs"
        onClick={() => i18n.changeLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant={i18n.language === 'my' ? 'primary' : 'ghost'}
        className="h-7 px-2 text-xs"
        onClick={() => i18n.changeLanguage('my')}
      >
        မြန်မာ
      </Button>
    </div>
  );
}
