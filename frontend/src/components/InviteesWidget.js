import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Button from "containers/Button";
import BButton from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import {
  Field,
  ErrorMessage,
  FieldArray,
  useFormikContext,
} from "formik";
import { FormattedMessage } from "react-intl";
import Cookies from "js-cookie";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ESTooltip } from "containers/Overlay";
import { getOrdinal } from "components/utils";
import {
  validateEmail,
  validateName,
  validateLang,
} from "components/validation";

const mapStateToProps = (state, props) => {
  let ordered;
  if (state.inviteform.ordered === null) {
    ordered = state.main.ui_defaults.ordered_invitations;
  } else {
    ordered = state.inviteform.ordered;
  }
  return {
    ordered: ordered,
  };
};

function _InviteesControl(props) {
  const fprops = useFormikContext();
  const arrayHelpers = props.arrayHelpers;
  const index = props.index;
  const invitee = props.invitee;
  return (
    <>
      {index > 0 && (
        <div className={"invitee-form-dismiss " + props.ordered}>
          <ESTooltip
            helpId={"button-remove-entry-" + index}
            inModal={true}
            tooltip={
              <FormattedMessage
                defaultMessage="Remove this entry from invitation"
                key="rm-invitation-tootip"
              />
            }
          >
            <BButton
              variant="outline"
              size="sm"
              onClick={() => {
                arrayHelpers.remove(index);
                window.setTimeout(() => {
                  document.getElementById("invitation-text-input").focus();
                  document.getElementById("invitation-text-input").blur();
                }, 0);
              }}
            >
              ×
            </BButton>
          </ESTooltip>
        </div>
      )}
      <Field name="id" value={`invitees.${index}.id`} type="hidden" />
      <div className="invitee-form-row" key={index}>
        <div className="invitee-form-name">
          <BForm.Group className="form-group">
            <BForm.Label htmlFor={`invitees.${index}.name`}>
              <FormattedMessage defaultMessage="Name" key="name-input-field" />
            </BForm.Label>
            <ErrorMessage
              name={`invitees.${index}.name`}
              component="div"
              className="field-error"
            />
            <Field
              name={`invitees.${index}.name`}
              data-testid={`invitees.${index}.name`}
              value={invitee.name}
              placeholder="Jane Doe"
              as={BForm.Control}
              type="text"
              validate={validateName(props, index)}
              isValid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].name &&
                (!fprops.errors.invitees ||
                  (fprops.errors.invitees &&
                    (!fprops.errors.invitees[index] ||
                      (fprops.errors.invitees[index] &&
                        !fprops.errors.invitees[index].name))))
              }
              isInvalid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].name &&
                fprops.errors.invitees &&
                fprops.errors.invitees[index] &&
                fprops.errors.invitees[index].name
              }
            />
          </BForm.Group>
        </div>
        <div className="invitee-form-email">
          <BForm.Group className="form-group">
            <BForm.Label htmlFor={`invitees.${index}.email`}>
              <FormattedMessage
                defaultMessage="Email"
                key="email-input-field"
              />
            </BForm.Label>
            <ErrorMessage
              name={`invitees.${index}.email`}
              component="div"
              className="field-error"
            />
            <Field
              name={`invitees.${index}.email`}
              data-testid={`invitees.${index}.email`}
              value={invitee.email}
              placeholder="jane@example.com"
              as={BForm.Control}
              type="email"
              validate={validateEmail(
                props,
                [...fprops.values.invitees],
                index,
                fprops.status
              )}
              isValid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].email &&
                (!fprops.errors.invitees ||
                  (fprops.errors.invitees &&
                    (!fprops.errors.invitees[index] ||
                      (fprops.errors.invitees[index] &&
                        !fprops.errors.invitees[index].email))))
              }
              isInvalid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].email &&
                fprops.errors.invitees &&
                fprops.errors.invitees[index] &&
                fprops.errors.invitees[index].email
              }
            />
          </BForm.Group>
        </div>
        <div className="invitee-form-language">
          <BForm.Group className="form-group">
            <BForm.Label htmlFor={`invitees.${index}.lang`}>
              <FormattedMessage
                defaultMessage="Language"
                key="language-input-field"
              />
            </BForm.Label>
            <ErrorMessage
              name={`invitees.${index}.lang`}
              component="div"
              className="field-error"
            />
            <Field
              name={`invitees.${index}.lang`}
              data-testid={`invitees.${index}.lang`}
              value={invitee.lang}
              as={BForm.Select}
              validate={validateLang}
              isValid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].lang &&
                (!fprops.errors.invitees ||
                  (fprops.errors.invitees &&
                    (!fprops.errors.invitees[index] ||
                      (fprops.errors.invitees[index] &&
                        !fprops.errors.invitees[index].lang))))
              }
              isInvalid={
                fprops.touched.invitees &&
                fprops.touched.invitees[index] &&
                fprops.touched.invitees[index].lang &&
                fprops.errors.invitees &&
                fprops.errors.invitees[index] &&
                fprops.errors.invitees[index].lang
              }
            >
              {AVAILABLE_LANGUAGES.map((lang, i) => (
                <option key={i} value={lang[0]}>
                  {lang[1]}
                </option>
              ))}
            </Field>
          </BForm.Group>
        </div>
      </div>
    </>
  );
}

const InviteesControl = connect(mapStateToProps)(_InviteesControl);

function _InviteesArrayOrdered(props) {
  const fprops = useFormikContext();
  return (
    <FieldArray
      name="invitees"
      validateOnChange={true}
      data-dummy={`dummy-${props.ordered}`}
    >
      {(arrayHelpers) => (
        <>
          <DragDropContext
            onBeforeCapture={() => {
              fprops.setStatus({ validate: false });
            }}
            onDragEnd={(result) => {
              if (!result.destination) {
                fprops.setStatus({ validate: true });
                return;
              }
              arrayHelpers.move(result.source.index, result.destination.index);
              fprops.setStatus({ validate: true });
            }}
          >
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {fprops.values.invitees.length > 0 &&
                    fprops.values.invitees.map((invitee, index) => (
                      <Draggable
                        key={invitee.id}
                        draggableId={invitee.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            data-dummy={`dummy-${props.ordered}`}
                            className="invitation-fields"
                            key={index}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {props.ordered && (
                              <>
                                <div className="invite-ordinal">
                                  <span className="">{getOrdinal(Cookies.get("lang") || "sv", index + 1)}</span>
                                  &nbsp;
                                  <FormattedMessage
                                    defaultMessage="invitation"
                                    key="invitation-for-ordinal"
                                  />
                                </div>
                              </>
                            )}
                            <InviteesControl
                              invitee={invitee}
                              index={index}
                              arrayHelpers={arrayHelpers}
                              {...props}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {props.button(arrayHelpers)}
        </>
      )}
    </FieldArray>
  );
}

const InviteesArrayOrdered = connect(mapStateToProps)(_InviteesArrayOrdered);

function _InviteesArray(props) {
  const fprops = useFormikContext();
  return (
    <FieldArray
      name="invitees"
      validateOnChange={true}
      data-dummy={`dummy-${props.ordered}`}
    >
      {(arrayHelpers) => (
        <>
          <div>
            {fprops.values.invitees.length > 0 &&
              fprops.values.invitees.map((invitee, index) => (
                <div
                  data-dummy={`dummy-${props.ordered}`}
                  className="invitation-fields"
                  key={index}
                >
                  <InviteesControl
                    invitee={invitee}
                    index={index}
                    arrayHelpers={arrayHelpers}
                    {...props}
                  />
                </div>
              ))}
          </div>
          {props.button(arrayHelpers)}
        </>
      )}
    </FieldArray>
  );
}

const InviteesArray = connect(mapStateToProps)(_InviteesArray);

function _InviteesWidget(props) {
  const [n_invites, setNInvites] = useState(1);
  const fprops = useFormikContext();
  const button = (arrayHelpers) => (
    <ESTooltip
      helpId={"button-add-invitation-" + props.docName}
      inModal={true}
      tooltip={
        <FormattedMessage
          defaultMessage="Invite one more person to sign this document"
          key="add-invitation-tootip"
        />
      }
    >
      <Button
        variant="outline-secondary"
        data-testid={"button-add-invitation-" + props.docName}
        onClick={() => {
          arrayHelpers.push({
            name: "",
            email: "",
            lang: Cookies.get("lang") || "en",
            id: `id${n_invites}`,
          });
          setNInvites(n_invites + 1);
        }}
      >
        <FormattedMessage
          defaultMessage="Invite more people"
          key="add-invite"
        />
      </Button>
    </ESTooltip>
  );
  return (
    <div className={`dummy-div-${props.ordered}`}>
      {(props.ordered && (
        <InviteesArrayOrdered button={button} {...props} />
      )) || <InviteesArray button={button} {...props} />}
    </div>
  );
}

export const InviteesWidget = connect(mapStateToProps)(_InviteesWidget);