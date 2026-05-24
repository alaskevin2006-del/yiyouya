import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { DestinationModal } from '../modals/DestinationModal';
import { AuthModal } from '../modals/AuthModal';
import { InvitePetPromptModal } from '../modals/InvitePetPromptModal';
import { InvitePetSelectModal } from '../modals/InvitePetSelectModal';
import { PetSelectModal } from '../modals/PetSelectModal';
import { PreferenceModal } from '../modals/PreferenceModal';
import { TravelSummaryModal } from '../modals/TravelSummaryModal';
import { WorldTypeModal } from '../modals/WorldTypeModal';

type ThemeMode = 'light' | 'dark';

function getThemeForCurrentTime(): ThemeMode {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 18 ? 'light' : 'dark';
}

export function AppLayout() {
  const openModal = useAppStore((state) => state.openModal);
  const setPreferenceSaveTarget = useAppStore((state) => state.setPreferenceSaveTarget);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authEmail = useAppStore((state) => state.authEmail);
  const signOut = useAppStore((state) => state.signOut);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [autoTheme, setAutoTheme] = useState<ThemeMode>(() => getThemeForCurrentTime());
  const [manualTheme, setManualTheme] = useState<ThemeMode | null>(null);
  const activeTheme = manualTheme ?? autoTheme;

  useEffect(() => {
    const timer = window.setInterval(() => setAutoTheme(getThemeForCurrentTime()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light-background', activeTheme === 'light');
    document.body.classList.toggle('bed-background', activeTheme === 'dark');
    return () => {
      document.body.classList.remove('light-background');
      document.body.classList.remove('bed-background');
    };
  }, [activeTheme]);

  return (
    <div className="app-shell">
      {/* UI-only shell: navigation opens existing modals and must not replace route/service logic. */}
      <header className="app-header">
        <div className="brand-mark" aria-label="逸游鸭 替我去看世界">
          <span className="brand-orbit" aria-hidden="true">
            <img src={activeTheme === 'light' ? '/assets/logo-light.png' : '/assets/logo-dark.png'} alt="" />
          </span>
          <div>
            <h1>逸游鸭</h1>
            <p>替我去看世界</p>
          </div>
        </div>
        <nav className="app-nav" aria-label="首页导航">
          <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>
            首页
          </Link>
          <button type="button" className="nav-link" onClick={() => openModal('petSelect')}>
            我的宠物
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              setPreferenceSaveTarget('close');
              openModal('preference');
            }}
          >
            偏好记忆
          </button>
          <span className="nav-link ghost">旅行足迹</span>
        </nav>
        <div className="header-actions">
          <button type="button" className="background-toggle-button" onClick={() => setManualTheme((theme) => (theme ?? activeTheme) === 'light' ? 'dark' : 'light')}>
            {activeTheme === 'light' ? '深色背景' : '明亮背景'}
          </button>
          <button type="button" className="signin-button" onClick={isAuthenticated ? () => void signOut() : () => openModal('auth')}>
            {isAuthenticated ? authEmail ?? '退出登录' : '邮箱登录'}
          </button>
          <button type="button" className="icon-button" aria-label="设置">
            ⚙
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <PetSelectModal />
      <AuthModal />
      <PreferenceModal />
      <WorldTypeModal />
      <InvitePetPromptModal />
      <InvitePetSelectModal />
      <DestinationModal />
      <TravelSummaryModal />
    </div>
  );
}
