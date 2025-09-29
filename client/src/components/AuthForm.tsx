import { useState, useEffect } from 'react';
import { AuthService, LoginRequest, RegisterRequest } from '../services/authService';
import { versionService } from '../services/versionService';

interface AuthFormProps {
  authService: AuthService;
  onAuthSuccess: (user: any) => void;
}

export function AuthForm({ authService, onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [versionInfo, setVersionInfo] = useState<string>('');

  useEffect(() => {
    versionService.getVersionInfo().then(v => {
      const parts = []
      if (v.monorepoVersion) parts.push(`repo:${v.monorepoVersion}`)
      if (v.clientVersion) parts.push(`client:${v.clientVersion}`)
      setVersionInfo(parts.length > 0 ? parts.join(' | ') : '')
    }).catch(() => setVersionInfo(''))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        const loginData: LoginRequest = {
          username: formData.username,
          password: formData.password
        };
        result = await authService.login(loginData);
      } else {
        const registerData: RegisterRequest = {
          username: formData.username,
          password: formData.password
        };
        result = await authService.register(registerData);
      }

      onAuthSuccess(result.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">🚀 Clack Chat</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to your chat application
          </p>
          {versionInfo && (
            <p className="mt-1 text-center text-xs text-gray-500">
              {versionInfo}
            </p>
          )}
        </div>
        
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <div className="flex mb-6">
            <button 
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border ${
                isLogin 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border ${
                !isLogin 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
