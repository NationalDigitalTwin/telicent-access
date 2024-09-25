import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { TeliChip, TeliSpinner, TeliSwitch } from "@telicent-oss/ds";

import FormInput from "./FormInput";
import Select from "../../Select/Select";
import config from "../../../config/app-config";
import { LookupContext } from "../../../context/LookupContext";
import {
  buildError,
  getLabel,
  sort,
  validateEmail,
} from "../../../utils/utils";
import RenderError from "../../../utils/RenderError";

const Form = forwardRef(({ basis, children }, ref) => {
  const emailRef = useRef();
  const { url } = config;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [labels, setLabels] = useState(undefined);
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState(() => {
    if (basis.userGroups) {
      return basis.userGroups;
    }
    return [];
  });
  const [values, setValues] = useState(basis);

  useEffect(() => {
    if (!labels) {
      return;
    }
    const requiredLabels = labels
      .filter((label) => label.user_required)
      .reduce((acc, curr) => {
        acc[curr.user_attribute_name] = undefined;
        return acc;
      }, {});
    setValues((prev) => {
      return { ...requiredLabels, ...prev };
    });
  }, [labels]);
  useEffect(() => {
    setError();

    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${url}/attributes`);
        setLabels(data);
      } catch (err) {
        setError(buildError(err));
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      try {
        const { data } = await axios.get(`${url}/groups`);
        setGroups(
          sort(
            data
              .filter(({ active }) => active)
              .map(({ group_id, label, description }) => ({
                value: group_id,
                label,
                description,
              })),
            "value"
          )
        );
      } catch (err) {
        setError(buildError(err));
      }
    })();
  }, [ref, url]);

  const onUserGroupChange = ({ target: { value } }) => {
    setUserGroups((prev) => [...prev, value].sort(Intl.Collator().compare));
  };

  const onRemoveUserGroup = (group) => {
    setUserGroups((prev) => prev.filter((grp) => grp !== group));
  };

  const onValueChange =
    (name) =>
    ({ target: { value } }) => {
      setValues({ ...values, [name]: value });
    };

  const onCheckedChange =
    (name) =>
    ({ target: { checked } }) => {
      setValues({ ...values, [name]: checked });
    };

  const mapLabelToInput = ({
    id,
    type,
    label,
    values: vals,
    options,
    onChange,
    isValidationActive,
  }) => {
    if (label === "clearance") {
      return (
        <ClassificationFormSelect
          id={id}
          key={id}
          placeholder="Select..."
          value={vals[label]}
          onChange={onChange(label)}
          isValidationActive={isValidationActive}
          error={error}
        />
      );
    }
    if (label === "nationality") {
      return (
        <CountryFormSelect
          id={id}
          key={id}
          placeholder="Select..."
          value={vals[label]}
          onChange={onChange(label)}
          isValidationActive={isValidationActive}
          error={error}
        />
      );
    }
    if (type === "enum" || type === "hierarchy") {
      return (
        <FormSelect
          id={id}
          key={id}
          options={options.map((option) => ({
            value: option,
            label: option,
          }))}
          label={getLabel("user", label)}
          placeholder="Select..."
          value={vals[label]}
          onChange={onChange(label)}
          isValidationActive={isValidationActive}
          error={error}
          isRequired
        />
      );
    }
    if (type === "string") {
      return (
        <FormInput
          id={id}
          key={id}
          label={getLabel("user", label)}
          placeholder={
            isValidationActive
              ? "Required"
              : `Enter ${getLabel("user", label).toLowerCase()}`
          }
          value={vals[label]}
          onChange={onChange(label)}
          isValidationActive={isValidationActive}
        />
      );
    }
    if (type === "boolean") {
      return (
        <TeliSwitch
          label={getLabel("user", label)}
          checked={vals[label]}
          onChange={onCheckedChange(label)}
        />
      );
    }
    return null;
  };

  const { name, email, active } = values;
  const [isValidationActive, setIsValidationActive] = useState(false);

  useImperativeHandle(ref, () => ({
    submitAttempted() {
      setIsValidationActive(true);
      emailRef.current?.setFocus(name && !validateEmail(email));
      return (
        Object.values(values).every((value) => !!value) && validateEmail(email)
      );
    },
    getValues() {
      return { values, userGroups };
    },
  }));

  const possGroups = groups.filter(({ value }) => !userGroups.includes(value));

  return (
    <form className="grid w-full grid-cols-3 gap-4 px-6 py-4">
      {loading && <TeliSpinner />}
      {!loading && (
        <>
          <div className="flex flex-col col-span-1 row-span-1">
            <FormInput
              id="name"
              label="name"
              placeholder={isValidationActive ? "Required" : "Enter name"}
              value={name}
              onChange={onValueChange("name")}
              isValidationActive={isValidationActive}
            />
            <FormInput
              id="email"
              ref={emailRef}
              label="email"
              placeholder={isValidationActive ? "Required" : "Enter email"}
              value={email}
              onChange={onValueChange("email")}
              isValidationActive={isValidationActive}
            />
            {(!Object.keys(values).length || !labels) && <p>Loading...</p>}
            {values &&
              labels?.map(({ _id, user_attribute_name, value }) =>
                mapLabelToInput({
                  id: _id,
                  type: value.type,
                  label: user_attribute_name,
                  values,
                  options: value.values,
                  onChange: onValueChange,
                  isValidationActive,
                })
              )}

            <TeliSwitch
              label="active"
              checked={active}
              onChange={onCheckedChange("active")}
            />
          </div>
          <div className="col-span-2 row-span-1 px-6">
            <div>
              <FormSelect
                id="groups"
                label="user groups"
                placeholder={
                  possGroups.length ? "Select..." : "No more groups available"
                }
                options={possGroups}
                value={null}
                onChange={onUserGroupChange}
                isValidationActive={isValidationActive}
                error={error}
              />
              {userGroups.map((group) => (
                <TeliChip
                  key={group}
                  label={group}
                  size="small"
                  className="mb-2 ml-2"
                  onDelete={() => onRemoveUserGroup(group)}
                />
              ))}
            </div>
          </div>
          <div className="col-start-3 col-end-3 row-start-2 row-end-2">
            <div className="flex flex-col items-end">{children}</div>
          </div>
        </>
      )}
    </form>
  );
});

const CountryFormSelect = ({
  id,
  placeholder,
  value,
  onChange,
  isValidationActive,
  formError,
}) => {
  const {
    countries: { error: countriesError, data },
  } = useContext(LookupContext);
  const [error, setError] = useState(formError);

  if (countriesError && countriesError !== error) {
    setError(countriesError);
  }

  const options =
    data?.map(({ alpha2, alpha3, name }) => ({
      value: alpha3,
      label: name,
      key: `${name}-${alpha3}`,
      alpha2,
    })) ?? [];

  return (
    <FormSelect
      id={id}
      label="nationality"
      placeholder={placeholder}
      options={options}
      value={value}
      onChange={onChange}
      isValidationActive={isValidationActive}
      error={error}
      isRequired
    />
  );
};

const ClassificationFormSelect = ({
  id,
  placeholder,
  value,
  onChange,
  isValidationActive,
  formError,
}) => {
  const {
    clearances: { error: clearancesError, data },
  } = useContext(LookupContext);
  const [error, setError] = useState(formError);

  if (clearancesError && clearancesError !== error) {
    setError(clearancesError);
  }

  const options =
    data?.tiers?.map((tier) => ({
      value: tier,
      label: getLabel("classification", tier),
      key: `classification-option-${tier}`,
    })) ?? [];
  return (
    <FormSelect
      id={id}
      label="clearance"
      placeholder={placeholder}
      options={options}
      value={value}
      onChange={onChange}
      isValidationActive={isValidationActive}
      error={error}
      isRequired
    />
  );
};

const FormSelect = ({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  loading,
  error,
  isValidationActive,
  isMulti,
  isRequired,
}) => {
  const isMissing = isRequired && isValidationActive && !value;

  return (
    <div className="flex flex-col mb-4">
      <label htmlFor={id} className="pb-2 text-xs font-thin uppercase">
        {label} {isRequired ? " *" : ""}
      </label>
      {loading && <p>Loading...</p>}
      {error && RenderError(error)}
      {!error && !loading && (
        <Select
          id={id}
          placeholder={placeholder}
          options={options}
          selectedValue={value}
          onChange={onChange}
          isMulti={isMulti}
          isNationality={label === "nationality"}
        />
      )}
      {isRequired && (
        <p className="mt-1 text-red-400">
          {isMissing ? `Please enter a ${label}` : ""}
        </p>
      )}
    </div>
  );
};

export default Form;
