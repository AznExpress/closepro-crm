import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isDemo } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await signIn('demo@closepro.app', 'demo');
    navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card animate-slide-up">
          {/* Logo */}
          <div className="auth-logo">
            <div className="logo-icon">
              <Building2 size={24} />
            </div>
            <span className="logo-text">ClosePro</span>
          </div>

          <div className="auth-header">
            <h1>Welcome back</h1>
            <p>Sign in to access your CRM</p>
          </div>

          {isDemo && (
            <div className="demo-banner">
              <AlertCircle size={16} />
              <span>Demo Mode - No Supabase configured</span>
            </div>
          )}

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@realestate.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>

          {isDemo && (
            <button 
              type="button" 
              className="btn btn-secondary btn-lg auth-submit"
              onClick={handleDemoLogin}
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              Continue with Demo
              <ArrowRight size={18} />
            </button>
          )}

          <div className="auth-footer">
            <span>Don't have an account?</span>
            <Link to="/signup">Create one</Link>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item animate-slide-up stagger-1">
            <div className="feature-icon">🔥</div>
            <div>
              <strong>Hot Lead Tracking</strong>
              <p>Never lose a deal</p>
            </div>
          </div>
          <div className="feature-item animate-slide-up stagger-2">
            <div className="feature-icon">📊</div>
            <div>
              <strong>Deal Pipeline</strong>
              <p>Visual deal tracking</p>
            </div>
          </div>
          <div className="feature-item animate-slide-up stagger-3">
            <div className="feature-icon">⏰</div>
            <div>
              <strong>Smart Reminders</strong>
              <p>Auto-generated follow-ups</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

