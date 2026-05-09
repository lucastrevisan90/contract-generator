-- Função para verificar status do e-mail (usada na recuperação de senha)
-- Esta função é SECURITY DEFINER para poder ler a tabela profiles mesmo sem usuário logado
CREATE OR REPLACE FUNCTION public.check_user_status_by_email(email_to_check TEXT)
RETURNS TABLE (
  user_exists BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM public.profiles WHERE email = email_to_check),
    COALESCE((SELECT subscription_status = 'active' FROM public.profiles WHERE email = email_to_check), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função pode ser chamada anonimamente (configuração do Supabase)
GRANT EXECUTE ON FUNCTION public.check_user_status_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_status_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_status_by_email(TEXT) TO service_role;
