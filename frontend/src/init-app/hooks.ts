/**
 * Store types and typed Redux hooks, for components written in TypeScript.
 *
 * The types are derived from the root reducer and the store factory in the
 * JS modules, so they follow the slices as they are converted. Components
 * use `useAppSelector` and `useAppDispatch` instead of the untyped hooks of
 * react-redux.
 */
import { useDispatch, useSelector } from "react-redux";
import rootReducer from "init-app/store";
import { edusignStore } from "init-app/init-app";

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof edusignStore>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
