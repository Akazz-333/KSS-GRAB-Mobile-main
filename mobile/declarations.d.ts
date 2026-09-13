declare module 'expo-router' {
  export function useRouter(): any;
  export function useLocalSearchParams<T = any>(): T;
  export function useGlobalSearchParams<T = any>(): T;
  export function usePathname(): string;
  export function useSegments(): string[];
  export function useFocusEffect(callback: () => void | (() => void)): void;
  export function useNavigation(): any;
  export const Link: any;
  export const Stack: any;
  export const Tabs: any;
  export const Slot: any;
  export const Redirect: any;
  export const router: any;
  export const SplashScreen: any;
  export const Drawer: any;
  export type Href = any;
}
