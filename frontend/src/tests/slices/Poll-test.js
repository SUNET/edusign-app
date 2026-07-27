/**
 * Tests for slices/Poll: the reducers, and the poll thunk against a real
 * store, with fetch-mock for the backend.
 */
import fetchMock from "fetch-mock";

import { edusignStore } from "init-app/init-app";
import { resetDb } from "init-app/database";
import { fetchConfig } from "slices/Main";
import reducer, {
  poll,
  setInitialPolling,
  setPolling,
  enablePolling,
  disablePolling,
  setTimerId,
} from "slices/Poll";

const mockIntl = { formatMessage: ({ defaultMessage }) => defaultMessage };

const initialState = {
  initialPoll: false,
  poll: false,
  disablePoll: false,
  timerId: null,
};

describe("Poll slice reducers", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("setInitialPolling enables polling", () => {
    const state = reducer(initialState, setInitialPolling(true));
    expect(state).toEqual({
      initialPoll: true,
      poll: true,
      disablePoll: false,
      timerId: null,
    });
  });

  it("setInitialPolling(false) does not re-enable a disabled poll", () => {
    const state = reducer(
      { ...initialState, disablePoll: true },
      setInitialPolling(false),
    );
    expect(state).toEqual({
      initialPoll: false,
      poll: false,
      disablePoll: true,
      timerId: null,
    });
  });

  it("setPolling sets poll and discards the pending timer", () => {
    jest.useFakeTimers();
    const timerId = setTimeout(() => {}, 10000);
    expect(jest.getTimerCount()).toEqual(1);

    const state = reducer({ ...initialState, timerId }, setPolling(true));
    expect(state.poll).toEqual(true);
    expect(state.timerId).toEqual(null);
    expect(jest.getTimerCount()).toEqual(0);
  });

  it("enablePolling clears disablePoll and restores initialPoll", () => {
    jest.useFakeTimers();
    const timerId = setTimeout(() => {}, 10000);

    const state = reducer(
      { initialPoll: true, poll: false, disablePoll: true, timerId },
      enablePolling(),
    );
    expect(state).toEqual({
      initialPoll: true,
      poll: true,
      disablePoll: false,
      timerId: null,
    });
    expect(jest.getTimerCount()).toEqual(0);
  });

  it("disablePolling sets disablePoll and discards the timer", () => {
    jest.useFakeTimers();
    const timerId = setTimeout(() => {}, 10000);

    const state = reducer(
      { ...initialState, poll: true, timerId },
      disablePolling(),
    );
    expect(state).toEqual({
      initialPoll: false,
      poll: true,
      disablePoll: true,
      timerId: null,
    });
    expect(jest.getTimerCount()).toEqual(0);
  });

  it("setTimerId replaces the previous timer", () => {
    jest.useFakeTimers();
    const timer1 = setTimeout(() => {}, 10000);
    const timer2 = setTimeout(() => {}, 10000);
    expect(jest.getTimerCount()).toEqual(2);

    const state = reducer({ ...initialState, timerId: timer1 }, setTimerId(timer2));
    expect(state.timerId).toBe(timer2);
    expect(jest.getTimerCount()).toEqual(1);
  });

  it("poll.fulfilled merges the response payload", () => {
    const state = reducer(initialState, {
      type: poll.fulfilled.type,
      payload: { payload: { poll: true } },
    });
    expect(state.poll).toEqual(true);
  });

  it("poll.fulfilled is ignored while polling is disabled", () => {
    const state = reducer(
      { ...initialState, disablePoll: true },
      {
        type: poll.fulfilled.type,
        payload: { payload: { poll: true } },
      },
    );
    expect(state.poll).toEqual(false);
    expect(state.disablePoll).toEqual(true);
  });
});

describe("poll thunk", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    fetchMock.restore();
    jest.useRealTimers();
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 25));

  const configPayload = (overrides = {}) => ({
    payload: {
      unauthn: false,
      poll: false,
      multisign_buttons: "true",
      signer_attributes: {
        name: "Tester Testig",
        eppn: "tester@example.org",
        mail: "tester@example.org",
        mail_aliases: ["tester@example.org"],
      },
      owned_multisign: [],
      pending_multisign: [],
      skipped: [],
      ui_defaults: { sendsigned: true, skip_final: true },
      available_loas: [],
      ...overrides,
    },
  });

  const setupStore = async (overrides) => {
    const store = edusignStore();
    fetchMock.get("/sign/config", configPayload(overrides));
    await store.dispatch(fetchConfig({ intl: mockIntl }));
    await flush();
    return store;
  };

  it("rejects when the user is not authenticated", async () => {
    const store = edusignStore();
    const action = await store.dispatch(poll());
    expect(action.type).toEqual("main/poll/rejected");
    expect(action.payload).toEqual("Not ready to poll");
  });

  it("rejects for eID invited users", async () => {
    const store = await setupStore({
      signer_attributes: {
        name: "Tester Testig",
        eppn: "tester@example.org",
        mail: "tester@example.org",
        mail_aliases: ["tester@example.org"],
        using_freja: true,
      },
    });
    const action = await store.dispatch(poll());
    expect(action.type).toEqual("main/poll/rejected");
    expect(action.payload).toEqual("No polling for eID invites");
  });

  it("merges owned and invited documents from the poll response", async () => {
    const ownedOld = {
      name: "owned.pdf",
      key: "o1",
      type: "application/pdf",
      state: "incomplete",
      pending: ["invited@example.org"],
      signed: [],
      declined: [],
      sendsigned: true,
      skipfinal: false,
      pprinted: false,
    };
    const invitedOld = {
      name: "invited.pdf",
      key: "i1",
      type: "application/pdf",
      state: "unconfirmed",
      pending: ["tester@example.org"],
      signed: [],
      declined: [],
      sendsigned: true,
      skipfinal: false,
      pprinted: false,
    };
    const store = await setupStore({
      owned_multisign: [ownedOld],
      pending_multisign: [invitedOld],
    });

    const ownedNew = {
      ...ownedOld,
      pending: [],
      signed: [{ name: "Invited", email: "invited@example.org" }],
    };
    const ownedAdded = {
      name: "new-owned.pdf",
      key: "o2",
      type: "application/pdf",
      state: "incomplete",
      pending: ["other@example.org"],
      signed: [],
      declined: [],
      sendsigned: true,
      skipfinal: false,
      pprinted: false,
    };
    const invitedNew = {
      ...invitedOld,
      signed: [{ name: "Other", email: "other@example.org" }],
    };
    const invitedAdded = {
      name: "new-invited.pdf",
      key: "i2",
      type: "application/pdf",
      state: "unconfirmed",
      pending: ["tester@example.org"],
      signed: [],
      declined: [],
      sendsigned: true,
      skipfinal: false,
      pprinted: false,
    };
    fetchMock.get("/sign/poll", {
      payload: {
        poll: true,
        owned_multisign: [ownedNew, ownedAdded],
        pending_multisign: [invitedNew, invitedAdded],
        skipped: [],
      },
    });

    const action = await store.dispatch(poll());
    expect(action.type).toEqual("main/poll/fulfilled");

    const state = store.getState();
    expect(state.main.owned_multisign.length).toEqual(2);
    // the owned doc with no more pending invitations is marked loaded
    expect(state.main.owned_multisign[0]).toEqual(
      expect.objectContaining({
        name: "owned.pdf",
        pending: [],
        signed: ownedNew.signed,
        state: "loaded",
      }),
    );
    expect(state.main.owned_multisign[1]).toEqual(
      expect.objectContaining({ name: "new-owned.pdf" }),
    );

    expect(state.main.pending_multisign.length).toEqual(2);
    expect(state.main.pending_multisign[0]).toEqual(
      expect.objectContaining({
        name: "invited.pdf",
        signed: invitedNew.signed,
      }),
    );
    expect(state.main.pending_multisign[1]).toEqual(
      expect.objectContaining({ name: "new-invited.pdf" }),
    );

    // the rest of the payload is merged into the poll state
    expect(state.poll.poll).toEqual(true);
  });

  it("moves skipped documents to the local documents", async () => {
    const ownedOld = {
      name: "skipped.pdf",
      key: "s1",
      type: "application/pdf",
      state: "incomplete",
      pending: ["invited@example.org"],
      signed: [],
      declined: [],
      sendsigned: true,
      skipfinal: true,
      pprinted: false,
      ordered: false,
    };
    const store = await setupStore({ owned_multisign: [ownedOld] });

    fetchMock.get("/sign/poll", {
      payload: {
        poll: false,
        owned_multisign: [],
        pending_multisign: [],
        skipped: [
          {
            key: "s1",
            signed: [{ name: "Invited", email: "invited@example.org" }],
            declined: [],
            pending: [],
            signed_content: "c2lnbmVk",
            pprinted: false,
          },
        ],
      },
    });

    const action = await store.dispatch(poll());
    expect(action.type).toEqual("main/poll/fulfilled");

    const state = store.getState();
    expect(state.main.owned_multisign).toEqual([]);
    expect(state.documents.documents.length).toEqual(1);
    expect(state.documents.documents[0]).toEqual(
      expect.objectContaining({
        name: "skipped.pdf",
        state: "signed",
        blob: "data:application/pdf;base64,c2lnbmVk",
      }),
    );
    // the document has been persisted to the db
    expect(state.documents.documents[0].id).toBeDefined();
  });

  it("rejects when the backend responds with an error", async () => {
    const store = await setupStore();
    fetchMock.get("/sign/poll", {
      error: true,
      message: "poll went wrong",
    });

    const action = await store.dispatch(poll());
    expect(action.type).toEqual("main/poll/rejected");
    expect(action.payload).toEqual("poll went wrong");
  });

  it("rejects when the poll request fails", async () => {
    const store = await setupStore();
    fetchMock.get("/sign/poll", { throws: new Error("network down") });

    const action = await store.dispatch(poll());
    expect(action.type).toEqual("main/poll/rejected");
    expect(action.payload).toEqual("Error: network down");
  });
});
