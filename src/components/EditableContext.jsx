import React, { createContext, useContext } from "react";

const EditableContext = createContext(true);

export const useEditable = () => useContext(EditableContext);

export const EditableProvider = ({ isEditable, children }) => {
  return (
    <EditableContext.Provider value={isEditable}>
      <fieldset disabled={!isEditable} className={!isEditable ? "opacity-70 pointer-events-none" : ""}>
        {children}
      </fieldset>
    </EditableContext.Provider>
  );
};
