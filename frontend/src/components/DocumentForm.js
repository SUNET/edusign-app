import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import Feedback from "react-bootstrap/Feedback";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormFile from "react-bootstrap/FormFile";
import Button from "react-bootstrap/Button";
import { FormattedMessage } from "react-intl";

const DocumentForm = () => (
  <div>
    <h1>
      <FormattedMessage defaultMessage="Enter Document" key="heading" />
    </h1>

    <Formik
      initialValues={{ document: "" }}
      validate={(values) => {
        const errors = { document: "bad bad" };
        return errors;
      }}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(false);
      }}
    >
      {({
        handleChange,
        handleSubmit,
        handleBlur,
        values,
        errors,
        touched,
        validateForm,
      }) => (
        <Form>
          <Field name="document">
            {({ field, formProps }) => (
              <FormGroup controlId="firstName">
                <FormLabel>
                  <FormattedMessage
                    defaultMessage="Document"
                    key="document-input"
                  />
                </FormLabel>
                <FormFile
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isValid={field.touched && !field.error}
                />
                {touched.document && errors.document ? (
                  <Feedback type="invalid">{errors.document}</Feedback>
                ) : null}
              </FormGroup>
            )}
          </Field>
          <Button onClick={validateForm}>
            <FormattedMessage defaultMessage="Send" key="send-button" />
          </Button>
        </Form>
      )}
    </Formik>
  </div>
);

export default DocumentForm;
