const createErrorFactory = (name: string) => {
  return class BussinessError extends Error {
    constructor(message: string) {
      super(message);
      this.name = name;
    }
  };
};

export const conectionMongoDBError = createErrorFactory('conexionMongoDBError');
export const conexionSocketError = createErrorFactory('conexionSocketError');
