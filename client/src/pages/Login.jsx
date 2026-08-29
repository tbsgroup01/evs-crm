import React, { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { AuthContext } from '../App';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const Login = () => {
  const { login } = useContext(AuthContext);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('/api/v1/auth/login', data);
      const user = res.data.data.user;
      const token = res.data.data.token;
      login(user, token);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">EVS CRM Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your corporate workspace account</p>
        </div>
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Corporate Email Address"
            id="email"
            type="email"
            register={register}
            errors={errors}
            placeholder="name@evscrm.com"
          />
          <Input
            label="Account Password"
            id="password"
            type="password"
            register={register}
            errors={errors}
            placeholder="••••••••"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
