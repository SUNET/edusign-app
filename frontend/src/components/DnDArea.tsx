import React from "react";
import Dropzone from "react-dropzone";
import { FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";
import type { FileRejection } from "react-dropzone";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpFromBracket } from "@fortawesome/free-solid-svg-icons";
import LittleSpinner from "components/LittleSpinner";
import "styles/DnDArea.scss";
import { useAppDispatch, useAppSelector } from "init-app/hooks";
import { addNotification } from "slices/Notifications";
import { setLoading, setWaiting, setReceiving } from "slices/DnDArea";
import { addDocument, createDocument, setState } from "slices/Documents";

// `slices/Documents` is still JavaScript, so its thunks carry no argument
// types. Give `createDocument` the signature it actually has, until that
// slice is converted to TypeScript.
const createDoc = createDocument as unknown as (arg: {
  doc: Record<string, unknown>;
  intl: IntlShape;
}) => ReturnType<typeof createDocument>;

/**
 * @component
 * @desc Drag and drop area for documents to sign.
 * <br />
 * I has 2 states, the initial "waiting" state,
 * and the "receiving" state triggered by a dragEnter event.
 */
function DnDArea() {
  const status = useAppSelector((state) => state.dnd.state);
  const intl = useIntl();
  const configured = Boolean(useAppSelector((state) => state.main.environment) !== undefined);
  const useFsAccessApi = Boolean(useAppSelector((state) => state.main.environment) !== "e2e");
  const dispatch = useAppDispatch();

  const handleDragEnter = () => {
    dispatch(setReceiving());
  };

  const handleDragLeave = () => {
    dispatch(setWaiting());
  };

  const handleFileDrop = (fileObjs: File[]) => {
    dispatch(setLoading());
    if (fileObjs.length === 0) {
      dispatch(setWaiting());
      return;
    }
    // Back to the waiting state once every file has been read,
    // successfully or not.
    let remaining = fileObjs.length;
    const fileDone = () => {
      remaining--;
      if (remaining === 0) {
        dispatch(setWaiting());
      }
    };
    for (const fileObj of fileObjs) {
      const file = {
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type,
        created: Date.now(),
        state: "loading",
        blob: null as string | ArrayBuffer | null,
        message: "",
      };
      dispatch(addDocument(file));
      const reader = new FileReader();
      reader.onload = async () => {
        const updatedFile = {
          ...file,
          blob: reader.result,
        };
        await dispatch(createDoc({ doc: updatedFile, intl: intl }));
        fileDone();
      };
      reader.onerror = async () => {
        const errorMsg = intl.formatMessage(
          {
            defaultMessage: "Error loading {name}",
            id: "containers.DnDArea.loading-error",
          },
          { name: fileObj.name },
        );
        dispatch(addNotification({ level: "danger", message: errorMsg }));
        file.state = "failed-loading";
        file.blob = null;
        file.message = intl.formatMessage({
          defaultMessage: "Document could not be loaded",
          id: "dnd-doc-not-loaded",
        });
        dispatch(setState(file));
        await dispatch(createDoc({ doc: file, intl: intl }));
        fileDone();
      };
      reader.readAsDataURL(fileObj);
    }
  };

  const handleRejected = (rejects: FileRejection[]) => {
    rejects.forEach((rejected) => {
      const errorMsg = intl.formatMessage(
        {
          id: "containers.DnDArea.rejected-doc",
          defaultMessage: "Not a PDF or XML document: {name}",
        },
        { name: rejected.file.name, type: rejected.file.type },
      );
      dispatch(addNotification({ level: "danger", message: errorMsg }));
    });
  };

  return (
    <>
      {(configured && (
        <>
          <h2 className="heading">
            <FormattedMessage defaultMessage="Add documents to sign" key="heading-1" />
          </h2>
          <p className="lead-text">
            <FormattedMessage
              defaultMessage="Please choose the PDF or XML documents you would like to sign."
              key="dnd-area-lead"
            />
          </p>
          <Dropzone
            accept={{
              "application/pdf": [".pdf"],
              "application/xml": [".xml"],
            }}
            onDrop={handleFileDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDropRejected={handleRejected}
            useFsAccessApi={useFsAccessApi}
          >
            {({ getRootProps, getInputProps }) => {
              if (status === "waiting") {
                return (
                  <section id="edusign-dnd-wrapper">
                    <div
                      {...getRootProps({
                        id: "edusign-dnd-area",
                        "data-testid": "edusign-dnd-area",
                      })}
                    >
                      <input
                        {...getInputProps({
                          id: "edusign-dnd-input",
                          "data-testid": "edusign-dnd-input",
                        })}
                      />
                      <FontAwesomeIcon id="dnd-arrow-up" icon={faArrowUpFromBracket} />
                      <div className="dnd-message dnd-message-pointer">
                        <div className="dnd-area-head">
                          <FormattedMessage
                            defaultMessage="Drag and drop files to be signed here"
                            key="dnd-area-head-1"
                          />
                        </div>
                        <div className="dnd-area-head">
                          <FormattedMessage defaultMessage="or" key="dnd-area-head-2" />
                        </div>
                        <div className="dnd-area-head">
                          <FormattedMessage
                            defaultMessage="click here to choose files to be signed"
                            key="dnd-area-head-3"
                          />
                        </div>
                      </div>
                      <div className="dnd-message dnd-message-touch">
                        <div className="dnd-area-head">
                          <FormattedMessage
                            defaultMessage="Tap here to choose files to be signed"
                            key="dnd-area-head-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                );
              } else if (status === "receiving") {
                return (
                  <section id="edusign-dnd-wrapper">
                    <div
                      {...getRootProps({
                        id: "edusign-dnd-area-receiving",
                      })}
                    >
                      <input {...getInputProps()} />
                      <span id="dnd-message-dropping">
                        <FormattedMessage defaultMessage="Drop documents here" key="dnd-area-dropping" />
                      </span>
                    </div>
                  </section>
                );
              } else {
                return (
                  <section id="edusign-dnd-wrapper">
                    <div
                      {...getRootProps({
                        id: "edusign-dnd-area-receiving",
                      })}
                    >
                      <input {...getInputProps()} />
                      <span id="dnd-message-dropping">
                        <LittleSpinner index="0" />
                      </span>
                    </div>
                  </section>
                );
              }
            }}
          </Dropzone>
        </>
      )) || (
        <section id="edusign-dnd-wrapper">
          <div id="edusign-dnd-area" data-testid="edusign-dnd-area">
            <span id="dnd-message-dropping">
              <FormattedMessage defaultMessage="Drop documents here" key="dnd-area-dropping" />
            </span>
          </div>
        </section>
      )}
    </>
  );
}

export default DnDArea;
