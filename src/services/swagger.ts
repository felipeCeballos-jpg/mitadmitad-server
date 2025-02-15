import swaggerJSDOC from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mitad Mitad Server',
      version: '1.0.0',
      description: 'Api documentation for the Mitad Mitad Server',
      contact: {
        name: 'Felipe Ceballos',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
    },
  },
};
