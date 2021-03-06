import expect from 'expect';

import Identity from '../src/identity';
import { create } from '../src/microstates';

import { TodoMVC, Todo } from './todomvc';

describe('Identity', () => {
  let id;
  let microstate;
  beforeEach(function() {
    microstate = create(TodoMVC)
      .todos.push({ title: "Take out The Milk", completed: true })
      .todos.push({ title: "Convince People Microstates is awesome" })
      .todos.push({ title: "Take out the Trash" })
      .todos.push({ title: "profit $$"});
    id = Identity(microstate);
  });

  it('is derived from its source object', function() {
    expect(id).toBeInstanceOf(TodoMVC);
  });

  it('has the same shape as the initial state.', function() {
    expect(id.completeAll).toBeInstanceOf(Function);
    expect(id.todos.state.length).toBe(4);
    expect(id.todos[0]).toBeInstanceOf(Todo);
    expect(id.todos[0].state).toBe(microstate.todos[0].state)
  });

  describe('invoking a transition', function() {
    let next;
    beforeEach(function() {
      next = id.todos[2].completed.set(true);
    });
    it('transitions the nodes which did change', function() {
      expect(next).not.toBe(id);
      expect(next.todos).not.toBe(id.todos);
      expect(next.todos[2]).not.toBe(id.todos[2]);
    });
    it('maintains the === identity of the nodes which did not change', function() {
      expect(next.todos[2].title).toBe(id.todos[2].title);
      expect(next.todos[0]).toBe(id.todos[0]);
      expect(next.todos[1]).toBe(id.todos[1]);
      expect(next.todos[3]).toBe(id.todos[3]);
    });
  });

  describe('identity of queries', function() {

    it('traverses queries and includes the microstates within them', function() {
      expect(id.completed).toBeDefined();
      expect(id.completed[0]).toBeInstanceOf(Todo);
    });

    describe('the effect of transitions on query identities', () => {
      let next;
      beforeEach(function() {
        next = id.completed[0].title.set('Take out the milk');
      });

      it('updates those queries which contain changed objects, but not ids *within* the query that remained the same', () => {
        expect(next.completed).not.toBe(id.completed);
        expect(next.completed[0]).not.toBe(id.completed[0]);
        expect(next.completed[1]).toBe(id.completed[1]);
      });

      it.skip('maintains the === identity of those queries which did not change', function() {
        expect(next.active[0]).toBe(id.active[0]);
        expect(next.active[1]).toBe(id.active[1]);
        expect(next.active).toBe(id.active)
      });

      it('maintains the === identity of the same node that appears at different spots in the tree', () => {
        expect(id.todos[0]).toBe(id.completed[0]);
        expect(next.todos[0]).toBe(next.completed[0]);
      })
    })
  });
})
