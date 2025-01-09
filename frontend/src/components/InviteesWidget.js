import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Button from "containers/Button";
import BButton from "react-bootstrap/Button";
import BForm from "react-bootstrap/Form";
import { Field, ErrorMessage, FieldArray, useFormikContext } from "formik";
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
  if (props.docOrdered === undefined || props.docOrdered === null) {
    if (state.inviteform.ordered === null) {
      ordered = state.main.ui_defaults.ordered_invitations;
    } else {
      ordered = state.inviteform.ordered;
    }
  } else {
    ordered = props.docOrdered;
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
  const inviteOrdinal = (
    <div className="invite-ordinal">
      <span className="">
        {getOrdinal(Cookies.get("lang") || "sv", index + 1)}
      </span>
      &nbsp;
      <FormattedMessage
        defaultMessage="invitation"
        key="invitation-for-ordinal"
      />
    </div>
  );
  const crossButton = (
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
          data-testid={`button-rm-entry-${index}`}
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
  );
  let heading = <></>;
  if (props.parentForm === "create") {
    if (props.ordered) {
      if (index === 0) {
        heading = <>{inviteOrdinal}</>;
      } else if (index > 0) {
        heading = (
          <div className="invite-header">
            {inviteOrdinal}
            {crossButton}
          </div>
        );
      }
    } else if (index > 0) {
      heading = <>{crossButton}</>;
    }
  } else if (props.parentForm === "edit") {
    if (props.ordered) {
      heading = (
        <div className="invite-header">
          {inviteOrdinal}
          {crossButton}
        </div>
      );
    } else {
      heading = <>{crossButton}</>;
    }
  }
  return (
    <>
      {heading}
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
                fprops.status,
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
                            data-testid={`draggable-invitation-field-${index}`}
                            key={index}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
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
                  data-testid={`invitation-field-${index}`}
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
      helpId="button-add-invitation"
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
        data-testid="button-add-invitation"
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
