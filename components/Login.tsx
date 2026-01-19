
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
  onRegister: (username: string, password: string) => void;
  siteName: string;
  logoInitial: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, siteName, logoInitial }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (isLogin) {
      onLogin(username, password, rememberMe);
    } else {
      onRegister(username, password);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>

      <div className="max-w-md w-full relative">
        <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200/60 backdrop-blur-xl">
          <div className="p-10 md:p-12">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-200 mb-6 rotate-3">
                {logoInitial}
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase text-center">
                {isLogin ? siteName : "GIA NHẬP " + siteName}
              </h2>
              <p className="text-slate-400 font-bold text-sm mt-2 text-center">
                {isLogin ? "Nền tảng thuê SIM OTP hàng đầu" : "Tạo tài khoản thuê SIM chỉ trong 30 giây"}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài khoản</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  placeholder="Nhập username..."
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  placeholder="••••••••"
                  required
                />
              </div>

              {!isLogin && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {isLogin && (
                <div className="flex items-center gap-3 px-1">
                  <label className="relative flex items-center cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                    />
                    <div className="w-5 h-5 bg-slate-100 border-2 border-slate-200 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center group-active:scale-90">
                      <svg className={`w-3 h-3 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <span className="ml-3 text-[11px] font-black text-slate-500 uppercase tracking-wider select-none">Ghi nhớ đăng nhập</span>
                  </label>
                </div>
              )}
              
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] uppercase text-xs tracking-[0.2em]"
              >
                {isLogin ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-6 py-3 rounded-xl uppercase tracking-wider"
              >
                {isLogin ? 'Bạn chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Quay lại đăng nhập'}
              </button>
              {isLogin && (
                 <p className="text-[10px] text-slate-400 font-bold">Quên mật khẩu? Liên hệ Admin để lấy lại</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Hệ thống vận hành bởi Cloud OTP v4.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
