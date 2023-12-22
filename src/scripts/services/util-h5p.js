/**
 * Look for field with given name in given collection.
 * @param {string} name Name of field to look for.
 * @param {object[]} fields Collection to look in.
 * @returns {object} Field object.
 */
export const findField = (name, fields) => {
  return fields.find((field) => field.name === name);
};

/**
 * Find field instance by name.
 * @param {string} name Name of field.
 * @param {object} instance Instance to look in.
 * @returns {object|null} Field instance.
 */
export const findInstance = (name, instance) => {
  if (!Array.isArray(instance?.children)) {
    return null;
  }

  return instance.children.find((instance) => {
    return instance?.field?.name === name;
  });
};

/**
 * Find parent library instance.
 * @param {string} libraryName Libary name.
 * @param {object} start Field.
 * @returns {object|null} Library instance.
 */
export const findParentLibrary = (libraryName, start) => {
  if (!start.parent) {
    return null;
  }

  if (
    typeof start.parent.currentLibrary === 'string' &&
    start.parent.currentLibrary.split(' ')[0] === `H5P.${libraryName}` &&
    Array.isArray(start.parent.children)
  ) {
    const found = start.parent.children.find((child) => {
      if (typeof child?.getMachineName !== 'function') {
        return false;
      }

      const machineName = child.getMachineName();
      return (typeof machineName === 'string' &&
        machineName.split('.')[1] === libraryName);
    });
    if (found) {
      return found;
    }
  }

  return findParentLibrary(libraryName, start.parent);
};
