import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);

    if (!isLogin) {
      // Check if email is authorized before signup
      try {
        const { data } = await supabase.functions.invoke("check-allowed-email", {
          body: { email },
        });
        if (!data?.allowed) {
          setLoading(false);
          toast.error("Este email não está autorizado a registar-se. Contacte o administrador.");
          return;
        }
      } catch {
        setLoading(false);
        toast.error("Erro ao verificar autorização. Tente novamente.");
        return;
      }
    }

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);
    if (error) {
      const genericMessage = isLogin
        ? "Email ou password inválidos. Por favor, tente novamente."
        : "Não foi possível criar a conta. Verifique os dados e tente novamente.";
      toast.error(genericMessage);
    } else if (!isLogin) {
      toast.success("Conta criada! Verifique o seu email para confirmar.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">Vending Machine</span>
          </div>
          <CardTitle className="text-lg">{isLogin ? "Iniciar Sessão" : "Criar Conta"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "A processar..." : isLogin ? "Entrar" : "Registar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary underline">
              {isLogin ? "Criar conta" : "Iniciar sessão"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
