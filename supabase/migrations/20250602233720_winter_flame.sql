/*
  # Correction de la synchronisation des utilisateurs
  
  1. Problème
    - Les noms et téléphones des nouveaux utilisateurs ne sont pas enregistrés
    - La fonction sync_auth_user ne récupère pas correctement les métadonnées
    
  2. Solution
    - Mise à jour de la fonction sync_auth_user pour mieux gérer les métadonnées
    - Amélioration de la gestion des erreurs
*/

-- Drop and recreate sync_auth_user function with better metadata handling
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log metadata for debugging
  RAISE NOTICE 'User metadata: %', NEW.raw_user_meta_data;
  
  -- Insert or update user profile with improved metadata handling
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    country,
    phone,
    created_at,
    terms_accepted,
    terms_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'FR'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.created_at,
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'terms_accepted')::boolean = true 
      THEN COALESCE(
        (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
        NEW.created_at
      )
      ELSE null
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = CASE 
      WHEN EXCLUDED.first_name != '' THEN EXCLUDED.first_name 
      ELSE users.first_name 
    END,
    last_name = CASE 
      WHEN EXCLUDED.last_name != '' THEN EXCLUDED.last_name 
      ELSE users.last_name 
    END,
    country = CASE 
      WHEN EXCLUDED.country != '' THEN EXCLUDED.country 
      ELSE users.country 
    END,
    phone = CASE 
      WHEN EXCLUDED.phone != '' THEN EXCLUDED.phone 
      ELSE users.phone 
    END,
    terms_accepted = EXCLUDED.terms_accepted,
    terms_accepted_at = EXCLUDED.terms_accepted_at,
    updated_at = CURRENT_TIMESTAMP;

  -- Set admin status for specific users
  UPDATE public.users
  SET is_admin = true
  WHERE email IN ('kundapay@gmail.com', 'minkoueobamea@gmail.com')
    AND id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in sync_auth_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();