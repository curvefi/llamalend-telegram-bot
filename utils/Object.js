const throwWhenAccessingUndefinedKey = (obj, objName) => (
  new Proxy(obj, {
    get(target, name) {
      if (
        typeof name === 'string' &&
        !(name in target) &&
        name !== 'inspect' &&
        name !== '$$typeof'
      ) {
        console.trace();
        throw new Error(`Property "${name}" not found on object ${objName}`);
      }

      return target[name];
    },
  })
);

// Clones values and reuses the same prototype, useful to pass getters in the prototype
// to the clone (compared to cloning, with this same method, an object containing itself
// a getter, which would lead to the clone having the getter untouched as a direct property,
// to the point that the getter would still reference the original object)
const shallowClone = (obj) => (
  Object.create(
    Object.getPrototypeOf(obj),
    Object.getOwnPropertyDescriptors(obj)
  )
);

export {
  throwWhenAccessingUndefinedKey,
  shallowClone,
};
