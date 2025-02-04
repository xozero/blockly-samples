/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const chai = require('chai');
const sinon = require('sinon');
const assert = chai.assert;
const Blockly = require('blockly/node');
const eventTestHelpers = require('./event_test_helpers');
const {testHelpers} = require('@blockly/dev-tools');
const {ObservableProcedureModel} = require('../src/observable_procedure_model');
const {ObservableParameterModel} = require('../src/observable_parameter_model');
const {ProcedureParameterRename} =
    require('../src/events_procedure_parameter_rename');


suite('Procedure Parameter Rename Event', function() {
  setup(function() {
    this.sandbox = sinon.createSandbox();
    this.clock = this.sandbox.useFakeTimers();
    this.workspace = new Blockly.Workspace();
    this.procedureMap = this.workspace.getProcedureMap();
    this.eventSpy = sinon.spy();
    this.workspace.addChangeListener(this.eventSpy);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('running', function() {
    const DEFAULT_NAME = 'default';
    const NON_DEFAULT_NAME = 'non-default';

    setup(function() {
      this.createProcedureAndParameter = (procId, paramId) => {
        const param = new ObservableParameterModel(
            this.workspace, DEFAULT_NAME, paramId);
        const proc = new ObservableProcedureModel(
            this.workspace, 'test name', procId)
            .insertParameter(param, 0);
        return {param, proc};
      };

      this.createEventToState = (procedureModel, parameterModel) => {
        return new ProcedureParameterRename(
            this.workspace,
            procedureModel,
            parameterModel,
            parameterModel.getName() === DEFAULT_NAME ?
                NON_DEFAULT_NAME :
                DEFAULT_NAME);
      };
    });

    suite('forward', function() {
      test(
          'the parameter with the matching ID and index is renamed',
          function() {
            const {param: initialParam, proc: initialProc} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            const {param: finalParam, proc: finalProc} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            finalParam.setName(NON_DEFAULT_NAME);
            const event = this.createEventToState(finalProc, finalParam);
            this.procedureMap.add(initialProc);

            event.run(/* forward= */ true);
            this.clock.runAll();

            assert.equal(
                initialParam.getName(),
                finalParam.getName(),
                'Expected the procedure parameter\'s name to be changed');
          });

      test('renaming a parameter fires a rename event', function() {
        const {param: initialParam, proc: initialProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        const {param: finalParam, proc: finalProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        finalParam.setName(NON_DEFAULT_NAME);
        const event = this.createEventToState(finalProc, finalParam);
        this.procedureMap.add(initialProc);

        this.eventSpy.resetHistory();
        event.run(/* forward= */ true);
        this.clock.runAll();

        eventTestHelpers.assertEventFiredShallow(
            this.eventSpy,
            ProcedureParameterRename,
            {
              procedure: initialProc,
              parameter: initialParam,
              oldName: DEFAULT_NAME,
            },
            this.workspace.id);
      });

      test('noop renames do not fire rename events', function() {
        const {proc: initialProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        const {param: finalParam, proc: finalProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        const event = this.createEventToState(finalProc, finalParam);
        this.procedureMap.add(initialProc);

        this.eventSpy.resetHistory();
        event.run(/* forward= */ true);
        this.clock.runAll();

        testHelpers.assertEventNotFired(
            this.eventSpy,
            ProcedureParameterRename,
            {},
            this.workspace.id);
      });

      test(
          'attempting to rename a parameter that does not exist throws',
          function() {
            const {param: finalParam, proc: finalProc} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            finalParam.setName(NON_DEFAULT_NAME);
            const event = this.createEventToState(finalProc, finalParam);
            this.clock.runAll();

            assert.throws(() => {
              event.run(/* forward= */ true);
            });
          });
    });

    suite('backward', function() {
      test(
          'the parameter with the matching ID and index is renamed',
          function() {
            const {param: initialParam, proc: initialProc} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            const {param: undoableParam, proc: undoableProc} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            initialParam.setName(NON_DEFAULT_NAME);
            undoableParam.setName(NON_DEFAULT_NAME);
            const event = this.createEventToState(undoableProc, undoableParam);
            this.procedureMap.add(initialProc);

            this.eventSpy.resetHistory();
            event.run(/* forward= */ false);
            this.clock.runAll();

            assert.equal(
                initialParam.getName(),
                DEFAULT_NAME,
                'Expected the procedure parameter\'s name to be changed');
          });

      test('renaming a parameter fires a rename event', function() {
        const {param: initialParam, proc: initialProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        const {param: undoableParam, proc: undoableProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        initialParam.setName(NON_DEFAULT_NAME);
        undoableParam.setName(NON_DEFAULT_NAME);
        const event = this.createEventToState(undoableProc, undoableParam);
        this.procedureMap.add(initialProc);
        this.clock.runAll();

        this.eventSpy.resetHistory();
        event.run(/* forward= */ false);
        this.clock.runAll();

        eventTestHelpers.assertEventFiredShallow(
            this.eventSpy,
            ProcedureParameterRename,
            {
              procedure: initialProc,
              parameter: initialParam,
              oldName: NON_DEFAULT_NAME,
            },
            this.workspace.id);
      });

      test('noop renames do not fire rename events', function() {
        const {proc: initialProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        const {param: undoableParam, proc: undoableProc} =
            this.createProcedureAndParameter('test procId', 'test paramId');
        undoableParam.setName(NON_DEFAULT_NAME);
        const event = this.createEventToState(undoableProc, undoableParam);
        this.procedureMap.add(initialProc);

        event.run(/* forward= */ false);
        this.clock.runAll();

        testHelpers.assertEventNotFired(
            this.eventSpy,
            ProcedureParameterRename,
            {},
            this.workspace.id);
      });

      test(
          'attempting to rename a parameter that does not exist throws',
          function() {
            const {param: initialParam} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            const {param: undoableParam, proc: undoableProc} =
                this.createProcedureAndParameter('test procId', 'test paramId');
            initialParam.setName(NON_DEFAULT_NAME);
            undoableParam.setName(NON_DEFAULT_NAME);
            const event = this.createEventToState(undoableProc, undoableParam);

            assert.throws(() => {
              event.run(/* forward= */ false);
            });
          });
    });
  });

  suite('serialization', function() {
    test('events round-trip through JSON', function() {
      const param = new ObservableParameterModel(
          this.workspace, 'test param name', 'test param id');
      const model =
          new ObservableProcedureModel(
              this.workspace, 'test name', 'test id')
              .insertParameter(param, 0);
      this.procedureMap.add(model);
      const origEvent = new ProcedureParameterRename(
          this.workspace, model, param, 'old name');

      const json = origEvent.toJson();
      const newEvent = Blockly.Events.fromJson(json, this.workspace);

      assert.deepEqual(newEvent, origEvent);
    });
  });
});
