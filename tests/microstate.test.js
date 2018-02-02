import 'jest';
import { map } from 'funcadelic';
import microstate, * as MS from '../src';
import { reveal } from '../src/utils/secret';

describe('microstate', () => {
  it('throws an error when a transition called state is defined', () => {
    expect(function() {
      microstate(
        class MyClass {
          state() {}
        }
      );
    }).toThrowError(
      `You can not use 'state' as transition name because it'll conflict with state property on the microstate.`
    );
  });
  it('throws an error when state property is set', () => {
    expect(function() {
      microstate(MS.Number).state = 10;
    }).toThrowError(`Setting state property will not do anything useful. Please don't do this.`);
  });
  describe('for Number', () => {
    describe('without initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(MS.Number);
      });
      it('has state', () => {
        expect(ms.state).toBe(0);
      });
      it('has transitions', () => {
        expect(ms).toMatchObject({
          set: expect.any(Function),
          increment: expect.any(Function),
        });
      });
      it('returns new state on transition', () => {
        expect(ms.increment().valueOf()).toBe(1);
      });
    });
    describe('with initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(MS.Number, 3);
      });
      it('returns new state on transition', () => {
        expect(ms.increment().valueOf()).toBe(4);
      });
    });
  });
  describe('for shallow composition', () => {
    class Modal {
      name = MS.String;
      isOpen = MS.Boolean;
    }
    describe('without initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(Modal);
      });
      it('is instance of Modal', () => {
        expect(ms.state).toBeInstanceOf(Modal);
      });
      it('initializes default', () => {
        expect(ms.state).toEqual({ name: '', isOpen: false });
      });
      it('has transitions', () => {
        expect(ms).toMatchObject({
          set: expect.any(Function),
          merge: expect.any(Function),
          name: {
            set: expect.any(Function),
            concat: expect.any(Function),
          },
          isOpen: {
            set: expect.any(Function),
            toggle: expect.any(Function),
          },
        });
      });
      it('replaces value when set is called on the node', () => {
        expect(ms.set({ name: 'taras' }).valueOf()).toEqual({ name: 'taras' });
      });
      it('replaces value when set is called on leaf state', () => {
        expect(ms.name.set('taras').valueOf()).toEqual({ name: 'taras' });
      });
    });
    describe('with initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(Modal, { isOpen: true });
      });
      it('uses provided state', () => {
        expect(ms.state).toEqual({ name: '', isOpen: true });
      });
      it('replaces value when set is called but uses provided value', () => {
        expect(ms.name.set('taras').valueOf()).toEqual({ name: 'taras', isOpen: true });
      });
      it('merges value on merge transition', () => {
        expect(ms.merge({ name: 'taras' }).valueOf()).toEqual({ name: 'taras', isOpen: true });
      });
    });
  });
  describe('shallow composition with arrays and objects', () => {
    class State {
      animals = MS.Array;
      config = MS.Object;
    }
    describe('without initial value', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(State);
      });
      it('initialies with default', () => {
        expect(ms.state).toEqual({
          animals: [],
          config: {},
        });
      });
      it('returns a new object with value pushed into an array', () => {
        expect(ms.animals.push('cat').valueOf()).toEqual({
          animals: ['cat'],
        });
      });
      it('return a new object with value assigned into the object', () => {
        expect(ms.config.assign({ x: 10, y: 20 }).valueOf()).toEqual({
          config: { x: 10, y: 20 },
        });
      });
    });
    describe('with initial value', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(State, { animals: ['cat', 'dog'], config: { color: 'red' } });
      });
      it('uses provided value', () => {
        expect(ms.state).toEqual({
          animals: ['cat', 'dog'],
          config: { color: 'red' },
        });
      });
      it('returns a new object with value pushed into an array', () => {
        expect(ms.animals.push('bird').valueOf()).toEqual({
          animals: ['cat', 'dog', 'bird'],
          config: { color: 'red' },
        });
      });
      it('return a new object with value assigned into the object', () => {
        expect(ms.config.assign({ x: 10, y: 20 }).valueOf()).toEqual({
          animals: ['cat', 'dog'],
          config: { x: 10, y: 20, color: 'red' },
        });
      });
    });
  });
  describe('recursive composition', () => {
    class Container {
      contains = Container;
      x = MS.Number;
      y = MS.Number;
    }
    describe('without initial value', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(Container);
      });
      it('initializes first level', () => {
        expect(ms.state).toMatchObject({
          contains: expect.any(Object),
          x: 0,
          y: 0,
        });
      });
      it('initializes recursively', () => {
        expect(ms.state).toMatchObject({
          contains: {
            x: 0,
            y: 0,
            contains: expect.any(Object),
          },
          x: 0,
          y: 0,
        });
      });
      it('transitions non recursive value', () => {
        expect(ms.x.increment().valueOf()).toEqual({
          x: 1,
        });
      });
      it('transition recursive value', () => {
        expect(ms.contains.y.increment().valueOf()).toEqual({
          contains: {
            y: 1,
          },
        });
      });
    });
    describe('with initial value', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(Container, {
          x: 10,
          y: 0,
          contains: { y: 20, x: 0, contains: { x: 30, y: 25, contains: {} } },
        });
      });
      it('restores state tree from initial value', () => {
        expect(ms.state).toMatchObject({
          x: 10,
          y: 0,
          contains: {
            y: 20,
            x: 0,
            contains: {
              x: 30,
              y: 25,
            },
          },
        });
      });
      it('transitions deeply nested state', () => {
        expect(ms.contains.contains.x.increment().valueOf()).toEqual({
          x: 10,
          y: 0,
          contains: { y: 20, contains: { x: 31, y: 25, contains: {} }, x: 0 },
        });
      });
      it('transitions deeply nested state without initial value', () => {
        expect(ms.contains.contains.contains.y.decrement().valueOf()).toEqual({
          x: 10,
          y: 0,
          contains: {
            y: 20,
            x: 0,
            contains: { x: 30, y: 25, contains: { y: -1 } },
          },
        });
      });
    });
  });
  describe('deep composition', () => {
    class Session {
      token = MS.String;
    }
    class Authentication {
      isAuthenticated = MS.Boolean;
      session = Session;
    }
    class State {
      authentication = Authentication;
    }
    describe('without initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(State);
      });
      it('builds state tree', () => {
        expect(ms.state).toMatchObject({
          authentication: {
            session: {
              token: '',
            },
          },
        });
      });
      it('transitions deeply nested state', () => {
        expect(ms.authentication.session.token.set('SECRET').valueOf()).toEqual({
          authentication: {
            session: { token: 'SECRET' },
          },
        });
      });
    });
    describe('with initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(State, {
          authentication: { isAuthenticated: true, session: { token: 'SECRET' } },
        });
      });
      it('builds state tree', () => {
        expect(ms.state).toMatchObject({
          authentication: {
            isAuthenticated: true,
            session: {
              token: 'SECRET',
            },
          },
        });
      });
    });
  });
  describe('custom transitions', () => {
    class Car {
      speed = MS.Number;
      increaseSpeed(current, amount) {
        return this().speed.sum(amount);
      }
    }
    class State {
      vehicle = Car;
    }
    describe('transition', () => {
      describe('without initial value', () => {
        let ms;
        beforeEach(() => {
          ms = microstate(State);
        });
        it('uses current state value', () => {
          expect(ms.vehicle.increaseSpeed(10).valueOf()).toEqual({ vehicle: { speed: 10 } });
        });
      });
      describe('with initial value', () => {
        let ms;
        beforeEach(() => {
          ms = microstate(State, { vehicle: { speed: 10 } });
        });
        it('creates initial value', () => {
          expect(ms.vehicle.increaseSpeed(10).valueOf()).toEqual({ vehicle: { speed: 20 } });
        });
      });
      describe('chained operations', function() {
        it('should maintain root', function() {
          expect(
            microstate(State)
              .vehicle.increaseSpeed(10)
              .vehicle.increaseSpeed(20)
              .valueOf()
          ).toEqual({ vehicle: { speed: 30 } });
        });
      });
    });
    describe('context', () => {
      let context;
      let result;
      beforeEach(() => {
        class State {
          items = MS.Array;
          custom() {
            context = this;
          }
        }
        let { custom } = microstate(State);
        custom();
      });
      it('is a function', () => {
        expect(context).toBeInstanceOf(Function);
      });
      it.skip('excludes custom transtions from context', () => {
        expect(context()).not.toHaveProperty('custom');
      });
      it('returns transitions', () => {
        expect(context()).toMatchObject({
          items: {
            push: expect.any(Function),
          },
          merge: expect.any(Function),
          set: expect.any(Function),
        });
      });
    });
    describe('type shifting', () => {
      describe('of root state', () => {
        class Choice {
          topic = MS.String;
          yes(current, reason) {
            return this(Yes).affirmation.set(reason);
          }
          no(current, reason) {
            return this(No).refutation.set(reason);
          }
        }
        class No extends Choice {
          refutation = MS.String;
        }
        class Yes extends Choice {
          affirmation = MS.String;
        }
        let ms, yes, no;
        beforeEach(() => {
          ms = microstate(Choice, { topic: 'Microstates are tiny' });
          yes = ms.yes('So tiny.');
          no = ms.no('They huge.');
        });
        it('returns affirmation for yes', () => {
          expect(yes.valueOf()).toEqual({ topic: 'Microstates are tiny', affirmation: 'So tiny.' });
        });
        it('returns refutation for no', () => {
          expect(no.valueOf()).toEqual({ topic: 'Microstates are tiny', refutation: 'They huge.' });
        });
        it(`changed the root's structure`, () => {
          expect(yes.state).toMatchObject({
            topic: 'Microstates are tiny',
            affirmation: 'So tiny.',
          });
        });
      });
    });
    describe('merging', () => {
      class ModalContent {
        text = MS.String;
      }
      class Modal {
        isOpen = MS.Boolean;
        title = MS.String;
        content = ModalContent;
      }
      class State {
        messages = MS.Array;
        modal = Modal;

        addItemAndShowModal(current, message, prompt) {
          return this()
            .messages.push(message)
            .modal.isOpen.set(true)
            .modal.content.text.set(prompt);
        }
      }
      let ms;
      let result;
      beforeEach(() => {
        ms = microstate(State, { modal: { title: 'Confirmation' } });
        result = ms.addItemAndShowModal('Hello World', 'You have a message');
      });
      it('returns merged state', () => {
        expect(result.valueOf()).toEqual({
          messages: ['Hello World'],
          modal: {
            isOpen: true,
            title: 'Confirmation',
            content: {
              text: 'You have a message',
            },
          },
        });
      });
    });
  });
  describe('computed properties support', () => {
    class State {
      firstName = MS.String;
      lastName = MS.String;
      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      }
      toUpperCase({ firstName, lastName }) {
        return this()
          .firstName.set(firstName.toUpperCase())
          .lastName.set(lastName.toUpperCase());
      }
    }
    describe('without initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(State);
      });
      it('is computed', function() {
        expect(ms.state.fullName).toEqual(' ');
      });
    });
    describe('with initial state', () => {
      let ms;
      beforeEach(() => {
        ms = microstate(State, { firstName: 'Peter', lastName: 'Griffin' });
      });
      it('is computed', () => {
        expect(ms.state.fullName).toEqual('Peter Griffin');
      });
      it('should not have getters in valueOf after custom transition', () => {
        expect(ms.toUpperCase().valueOf()).not.toHaveProperty('fullName');
      });
    });
  });
  describe('constants support', () => {
    class Type {
      n = 10;
      b = true;
      s = 'hello';
      o = { hello: 'world' };
      a = ['a', 'b', 'c'];
      null = null;
      greeting = MS.String;
    }
    let ms = microstate(Type);
    let next = ms.greeting.set('HI');
    it('includes constants in state tree', () => {
      // once transition-context is merged, need to add collapsed to
      // the end of state().
      expect(ms.state).toEqual({
        n: 10,
        b: true,
        s: 'hello',
        o: { hello: 'world' },
        a: ['a', 'b', 'c'],
        null: null,
        greeting: '',
      });
    });
    it('constants are not included in valueOf', () => {
      expect(ms.valueOf()).toBeUndefined();
    });
    it('next state has constants', () => {
      expect(next.state).toEqual({
        n: 10,
        b: true,
        s: 'hello',
        o: { hello: 'world' },
        a: ['a', 'b', 'c'],
        null: null,
        greeting: 'HI',
      });
    });
    it('next valueOf excludes constants', () => {
      expect(next.valueOf()).toEqual({ greeting: 'HI' });
    });
    it.skip('shares complex objects between multiple instances of microstate', () => {
      expect(ms.state.o).toBe(microstate(Type).state.o);
    });
  });
  describe('valueOf', () => {
    let ms;
    beforeEach(() => {
      ms = microstate(MS.Number, 10);
    });
    it('returns passed in value of', () => {
      expect(ms.valueOf()).toBe(10);
    });
    it('is not enumerable', () => {
      expect(ms).not.toHaveProperty('valueOf');
    });
  });
  describe('transition inheritance', () => {
    class Confirmation {
      get isArmed() {
        return false;
      }
      get isConfirmed() {
        return false;
      }

      arm() {
        return this(Armed);
      }

      reset() {
        return this(Confirmation);
      }
    }

    class Armed extends Confirmation {
      get isArmed() {
        return false;
      }

      confirm() {
        return this(Confirmed);
      }
    }

    class Confirmed extends Confirmation {
      get isConfirmed() {
        return true;
      }
    }

    let dnd = microstate(Confirmation);

    it('can transition to inherited transition', () => {
      expect(
        dnd
          .arm()
          .confirm()
          .reset()
          .arm().state
      ).toBeInstanceOf(Armed);
    });
  });
  describe('with value', () => {
    it('from a number', () => {
      let ms = microstate(42);

      expect(ms.state).toBe(42);
      expect(ms).toMatchObject({
        increment: expect.any(Function),
      });
    });
    describe('noop transition', () => {
      class Person {
        name = MS.String;
        isCool = MS.Boolean;
        noopThis() {
          return this();
        }
        noopCurrent(current) {
          return current;
        }
      }
      let ms = microstate(Person, { name: 'Sivakumar', isCool: true });
      it(`doesn't change current state when this() is returned`, () => {
        let result = ms.noopThis();
        expect(result.state).toMatchObject({
          name: 'Sivakumar',
          isCool: true,
        });
      });
      it(`doesn't change current state when current is returned`, () => {
        let result = ms.noopCurrent();
        expect(result.state).toMatchObject({
          name: 'Sivakumar',
          isCool: true,
        });
      });
    });
    describe('from an object', () => {
      let ms = microstate({ character: { name: 'Peter Griffin', age: 64 } });
      it('has state', () => {
        expect(ms.state).toMatchObject({
          character: {
            name: 'Peter Griffin',
            age: 64,
          },
        });
      });
      it('has transitions', () => {
        expect(ms).toMatchObject({
          character: {
            name: {
              concat: expect.any(Function),
            },
            age: {
              increment: expect.any(Function),
            },
          },
        });
      });
      it('transitions', () => {
        expect(ms.character.age.increment().state).toMatchObject({
          character: {
            age: 65,
          },
        });
      });
    });
  });
  describe('mapping', function() {
    class MyType {
      myProp = MS.String;
    }
    let actions;
    beforeEach(() => {
      actions = map(transition => (...args) => transition(...args), microstate(MyType));
    })
    it('keeps objects as objects', () => {
      expect(actions).toMatchObject({
        set: expect.any(Function),
        myProp: {
          set: expect.any(Function),
        },
      });
    });
    it('has working transitions', () => {
      expect(actions.myProp.set('foo').state).toEqual({ myProp: 'foo' });
    });
  });
});
