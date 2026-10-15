/**
 * Tests for the typed Redux hooks in init-app/hooks. Also the first
 * TypeScript test: it exercises the babel and jest setup for .ts and .tsx.
 */
import React from "react";
import { Provider } from "react-redux";
import { act, renderHook } from "@testing-library/react";

import { edusignStore } from "init-app/init-app";
import { useAppDispatch, useAppSelector } from "init-app/hooks";
import { hideAL3Warning, showAL3Warning } from "slices/AL3Warning";

describe("init-app/hooks", () => {
  it("selects from the app store and dispatches to it", () => {
    const store = edusignStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(
      () => ({
        show: useAppSelector((state) => state.al3warning.show),
        dispatch: useAppDispatch(),
      }),
      { wrapper },
    );

    expect(result.current.show).toBe(false);

    act(() => {
      result.current.dispatch(showAL3Warning());
    });
    expect(result.current.show).toBe(true);
    expect(store.getState().al3warning.show).toBe(true);

    act(() => {
      result.current.dispatch(hideAL3Warning());
    });
    expect(result.current.show).toBe(false);
  });
});
