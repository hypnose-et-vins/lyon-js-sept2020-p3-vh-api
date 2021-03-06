const request = require('supertest');
const faker = require('faker');
const app = require('../app.js');
const User = require('../models/users.js');

const getValidAttributes = () => {
  const password = faker.internet.password();
  return {
    firstname: faker.unique(faker.name.firstName),
    lastname: faker.unique(faker.name.lastName),
    email: faker.unique(faker.internet.email),
    phone_number: faker.unique(faker.phone.phoneNumber),
    password,
    password_confirmation: password,
  };
};

const createRecord = (attributes) =>
  User.createUser(attributes || getValidAttributes());

let res;
let testedEntity;
let attributes;

describe(`users endpoints`, () => {
  describe(`GET /users`, () => {
    describe('when there are two items in DB', () => {
      beforeEach(async () => {
        await Promise.all([createRecord(), createRecord()]);
        res = await request(app).get('/users');
      });

      it('status is 200', async () => {
        expect(res.status).toBe(200);
      });

      it('the returned body is an array containing two elements', async () => {
        expect(Array.isArray(res.body));
        expect(res.body.length).toBe(2);
      });

      it('the returned elements have expected properties', async () => {
        const expectedProps = ['id', 'email'];
        res.body.forEach((element) => {
          expectedProps.forEach((prop) => {
            expect(element[prop]).not.toBe(undefined);
          });
        });
      });
    });
  });
  describe(`GET /users/:id`, () => {
    describe('with existing entity id', () => {
      beforeAll(async () => {
        testedEntity = await createRecord();
        res = await request(app).get(`/users/${testedEntity.id}`);
      });

      it('returns 200', () => {
        expect(res.status).toBe(200);
      });

      it('returned object in body has correct properties', () => {
        expect(res.body).toEqual(testedEntity);
      });

      it('returned object does not contain password', () => {
        expect(res.body.password_confirmation).toBe(undefined);
        expect(res.body.password).toBe(undefined);
        expect(res.body.encrypted_password).toBe(undefined);
      });
    });

    describe('with non-existing entity id', () => {
      beforeAll(async () => {
        res = await request(app).get(`/users/9999999999`);
      });

      it('returns 404', () => {
        expect(res.status).toBe(404);
      });
    });
  });
    describe('without request body', () => {
      beforeAll(async () => {
        res = await request(app).post(`/users`);
      });

      it('returns 400 status', async () => {
        expect(res.statusCode).toEqual(400);
      });
    });
    describe('when valid datas are sent', () => {
      beforeAll(async () => {
        attributes = getValidAttributes();
        res = await request(app).post(`/users`).send(attributes);
      });

      it('returns 201 status', async () => {
        expect(res.statusCode).toEqual(201);
      });

      it('returns the id of the created user', async () => {
        expect(res.body).toHaveProperty('id');
      });
    });
    describe('when a user with the same email already exists in DB', () => {
      beforeAll(async () => {
        const validEntity = await createRecord();
        res = await request(app)
          .post(`/users`)
          .send({ ...getValidAttributes(), email: validEntity.email });
      });

      it('returns a 422 status', async () => {
        expect(res.status).toBe(422);
      });

      it('returns an error message', async () => {
        expect(res.body).toHaveProperty('errorMessage');
        expect(Array.isArray(res.body.errorsByField)).toBe(true);
        expect(
          !!res.body.errorsByField.find(
            (e) => e.path.includes('email') && e.type === 'unique'
          )
        ).toBe(true);
      });
    });

    describe('when email is not provided', () => {
      beforeAll(async () => {
        res = await request(app).post(`/users`).send({
          password: 'zfeyfgeyfgr',
          password_confirmation: 'zfeyfgeyfgr',
        });
      });

      it('returns a 422 status', async () => {
        expect(res.status).toBe(422);
      });

      it('returns an error message', async () => {
        expect(res.body).toHaveProperty('errorMessage');
      });
    });

    describe('when password is not provided', () => {
      beforeAll(async () => {
        res = await request(app).post(`/users`).send({
          password_confirmation: 'zfeyfgeyfgr',
          email: 'john.doe@gmail.com',
        });
      });

      it('returns a 422 status', async () => {
        expect(res.status).toBe(422);
      });

      it('retuns an error message', async () => {
        expect(res.body).toHaveProperty('errorMessage');
      });
    });

    describe('when password_confirmation is not provided', () => {
      beforeAll(async () => {
        res = await request(app).post(`/users`).send({
          password: 'zfeyfgeyfgr',
          email: 'john.doe@gmail.com',
        });
      });

      it('returns a 422 status', async () => {
        expect(res.status).toBe(422);
      });

      it('retuns an error message', async () => {
        expect(res.body).toHaveProperty('errorMessage');
      });
    });
  });
  describe(`PUT /users/:id`, () => {

    describe('without request body', () => {
      beforeAll(async () => {
        testedEntity = await createRecord();
        res = await request(app).put(
          `/users/${testedEntity.id}`
        );
      });

      it('returns 400 status', async () => {
        expect(res.statusCode).toEqual(400);
      });
    });
    describe('when passwords are not provided', () => {
      beforeAll(async () => {
        testedEntity = await createRecord();
        attributes = getValidAttributes();
        delete attributes.password_confirmation;
        delete attributes.password;
        res = await request(app)
          .put(`/users/${testedEntity.id}`)
          .send(attributes);
      });

      it('returns a 200 status', async () => {
        expect(res.status).toBe(200);
      });
    });

    describe('when password is provided but password_confirmation is not provided', () => {
      beforeAll(async () => {
        testedEntity = await createRecord();
        attributes = getValidAttributes();
        delete attributes.password_confirmation;
        res = await request(app)
          .put(`/users/${testedEntity.id}`)
          .send(attributes);
      });

      it('returns a 422 status', async () => {
        expect(res.status).toBe(422);
      });

      it('retuns an error message', async () => {
        expect(res.body).toHaveProperty('errorMessage');
      });
    });

    describe('when a user with the same email already exists in DB', () => {
      beforeAll(async () => {
        const other = await createRecord();
        testedEntity = await createRecord();
        attributes = { ...getValidAttributes(), email: other.email };
        res = await request(app)
          .put(`/users/${testedEntity.id}`)
          .send(attributes);
      });

      it('returns a 422 status', async () => {
        expect(res.status).toBe(422);
      });

      it('returns an error message', async () => {
        expect(res.body).toHaveProperty('errorMessage');
        expect(Array.isArray(res.body.errorsByField)).toBe(true);
        expect(
          !!res.body.errorsByField.find(
            (e) => e.path.includes('email') && e.type === 'unique'
          )
        ).toBe(true);
      });
    });
    describe('with a valid entity', () => {
      beforeAll(async () => {
        testedEntity = await createRecord();
        attributes = getValidAttributes();
        res = await request(app)
          .put(`/users/${testedEntity.id}`)
          .send(attributes);
      });

      it('returns 200', () => {
        expect(res.status).toBe(200);
      });

      it('returns the entity with correct properties', () => {
        expect(res.body.id).toBe(testedEntity.id);
        expect(res.body.email).toBe(attributes.email);
      });
    });
    describe('with an non-existing entity id', () => {
      beforeAll(async () => {
        res = await request(app)
          .put(`/users/99999999`)
          .send(getValidAttributes());
      });

      it('returns 404', () => {
        expect(res.status).toBe(404);
      });
    });
  });
  describe(`DELETE /users/:id`, () => {
    describe('with a valid entity', () => {
      beforeAll(async () => {
        const user = await createRecord();
        res = await request(app).delete(`/users/${user.id}`);
      });

      it('returns 204', () => {
        expect(res.status).toBe(204);
      });
    });
    describe('with an non-existing entity id', () => {
      beforeAll(async () => {
        res = await request(app).delete(`/users/99999999`);
      });

      it('returns 404', () => {
        expect(res.status).toBe(404);
      });
    });
  });

  exports.getValidAttributes = getValidAttributes;