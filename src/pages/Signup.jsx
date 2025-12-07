import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, isDemo } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordRequirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'Contains a number', met: /\d/.test(password) },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(password) }
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card animate-slide-up">
            <div className="auth-logo">
              <div className="logo-icon">
                <Building2 size={24} />
              </div>
              <span className="logo-text">ClosePro</span>
            </div>

            <div className="success-message">
              <CheckCircle size={48} className="success-icon" />
              <h2>Check your email</h2>
              <p>
                We've sent a confirmation link to <strong>{email}</strong>.
                Click the link to activate your account.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 'var(--spacing-lg)' }}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <h1>Create your account</h1>
            <p>Start closing more deals today</p>
          </div>

          {isDemo && (
            <div className="demo-banner">
              <AlertCircle size={16} />
              <span>Demo Mode - Account creation simulated</span>
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
              <label htmlFor="fullName">Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

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
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {password && (
                <div className="password-requirements">
                  {passwordRequirements.map((req, i) => (
                    <div 
                      key={i} 
                      className={`requirement ${req.met ? 'met' : ''}`}
                    >
                      <CheckCircle size={14} />
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading || !isPasswordValid}
            >
              {loading ? 'Creating account...' : 'Create account'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-terms">
            By signing up, you agree to our{' '}
            <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>
          </div>

          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item animate-slide-up stagger-1">
            <div className="feature-icon">✨</div>
            <div>
              <strong>Free 14-day trial</strong>
              <p>No credit card required</p>
            </div>
          </div>
          <div className="feature-item animate-slide-up stagger-2">
            <div className="feature-icon">🚀</div>
            <div>
              <strong>Setup in minutes</strong>
              <p>Import contacts easily</p>
            </div>
          </div>
          <div className="feature-item animate-slide-up stagger-3">
            <div className="feature-icon">💬</div>
            <div>
              <strong>Built for agents</strong>
              <p>By agents who get it</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

