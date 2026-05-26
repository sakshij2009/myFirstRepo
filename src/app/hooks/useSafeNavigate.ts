import { useNavigate, useInRouterContext } from 'react-router';

const noopNavigate = (() => {}) as ReturnType<typeof useNavigate>;

/**
 * A safe wrapper around useNavigate that works even when
 * the component is rendered outside a Router context (e.g. Figma preview).
 */
export function useSafeNavigate() {
  const inRouter = useInRouterContext();
  const navigate = inRouter ? useNavigate() : noopNavigate;
  return navigate;
}
