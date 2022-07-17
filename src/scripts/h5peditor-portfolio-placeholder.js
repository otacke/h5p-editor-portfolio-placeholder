// import FormManager from './h5peditor-portfolio-placeholder-form-manager';
import LayoutSelector from './h5peditor-portfolio-placeholder-layout-selector';
import LayoutTemplate from './h5peditor-portfolio-placeholder-layout-template';
import './h5peditor-portfolio-placeholder-editor-overlay';

/** Class for Portfolio Placeholder H5P widget */
class PortfolioPlaceholder {

  /**
   * @constructor
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params = {}, setValue) {
    // TODO: Find out why this is called multiple times

    this.parent = parent;
    this.field = field;
    this.params = params || {};
    this.setValue = setValue;

    this.library = `${parent.library}/${this.field.name}`;

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children until we're done
    this.readies = [];
    this.passReadies = true;
    this.parent.ready(() => {
      this.passReadies = false;
    });

    // DOM, H5P may require $container
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-portfolio-placeholder'
    });

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');

    //     doneButtonLabel: H5PEditor.t('H5PEditor.CoursePresentation', 'done'),
    //     deleteButtonLabel: H5PEditor.t('H5PEditor.CoursePresentation', 'remove'),
    //     expandBreadcrumbButtonLabel: H5PEditor.t('H5PEditor.CoursePresentation', 'expandBreadcrumbButtonLabel'),
    //     collapseBreadcrumbButtonLabel: H5PEditor.t('H5PEditor.CoursePresentation', 'collapseBreadcrumbButtonLabel')
    //   },
    //   customIconClass: 'portfolioplaceholder'
    // });

    this.initialize();

    // Use H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'foo'); to output translatable strings
  }

  initialize() {
    this.fieldsLayout = this.findField('arrangement', this.field.fields);
    this.params.arrangement = this.params.arrangement || this.fieldsLayout.default || '1';

    this.layoutSelector = new LayoutSelector(
      { layouts: this.fieldsLayout.options },
      {
        onLayoutChanged: (layoutId => {
          this.params.arrangement = layoutId;
          this.updateContentsDOM();
          this.setValue(this.field, this.params);
          this.handleFieldChange();
        })
      }
    );
    if (this.params.arrangement) {
      this.layoutSelector.selectLayout(this.params.arrangement);
    }

    // Add layout selector
    this.$container.get(0).appendChild(this.layoutSelector.getDOM());

    // Add contents
    this.contentsWrapper = document.createElement('div');
    this.contentsWrapper.classList.add('h5peditor-portfolio-placeholder-contents-wrapper');
    this.$container.get(0).appendChild(this.contentsWrapper);

    this.updateContentsDOM();
  }

  updateContentsDOM() {
    if (!this.contentsWrapper) {
      return;
    }

    this.contentsWrapper.innerHTML = '';
    this.contentsWrapper.appendChild(this.buildContentsDOM());
  }

  /**
   * Build Contents DOM.
   * @return {HTMLElement} Contents DOM.
   */
  buildContentsDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5peditor-portfolio-placeholder-contents');

    const layoutTemplate = new LayoutTemplate(
      {
        layout: this.params.arrangement
      },
      {
        onClicked: (buttonId => {
          this.handlePlaceholderClicked(buttonId);
        })
      }
    );
    contents.appendChild(layoutTemplate.getDOM());

    return contents;
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$wrapper = $wrapper;
    this.$container.appendTo($wrapper);

    const treeTop = $wrapper.get(0).closest('.tree');
    if (!treeTop) {
      return;
    }

    H5PEditor.PortfolioEditorOverlay.setCallback(
      'onRemoved',
      (() => {
        this.showConfirmationDialog(
          {
            headerText: 'TODO: confirmRemoveElement',
            cancelText: 'TODO: cancel',
            confirmText: 'TODO: ok',
          },
          {
            onCancelled: (() => {
              return;
            }),
            onConfirmed: (() => {
              // TODO: Remove field params
              H5PEditor.PortfolioEditorOverlay.hide();
            })
          }
        );
      })
    );

    H5PEditor.PortfolioEditorOverlay.setCallback(
      'onDone',
      (() => {
        // TODO: Why does this seem to need some change trigger on the form?
        // this.setValue(this.field, this.params);
        this.validate();
        H5PEditor.PortfolioEditorOverlay.hide();
        this.handleFieldChange();
      })
    );

    treeTop.appendChild(H5PEditor.PortfolioEditorOverlay.getDOM());
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @return {boolean} True, if current value is valid, else false.
   */
  validate() {
    // TODO: Validate this.params.fields
    return this.layoutSelector.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.remove();
  }

  /**
   * Handle change of placeholders.
   */
  handleFieldChange() {
    this.changes.forEach(change => {
      change(this.params);
    });
  }

  /**
   * Handle placeholder clicked.
   * @param {number} placeholderId Placeholder id.
   */
  handlePlaceholderClicked(placeholderId) {
    const form = this.buildForm(placeholderId);
    H5PEditor.PortfolioEditorOverlay.setFormFields(form);
    H5PEditor.PortfolioEditorOverlay.show();
  }

  buildForm(id) {
    const fieldsNeededCount = this.params.arrangement
      .split('-')
      .reduce((sum, current) => sum + Number(current), 0);

    // Fill up fields
    while (this.params.fields.length < fieldsNeededCount) {
      this.params.fields.push({
        isHidden: false
      });
    }

    // TODO: Make nicer
    const elementFields = (this.findField('fields', this.field.fields)).field.fields;

    const editorForm = document.createElement('div');
    editorForm.classList.add('h5p-editor-portfolio-placeholder-form');

    // Render element fields to form in DOM
    H5PEditor.processSemanticsChunk(
      elementFields,
      this.params.fields[id],
      H5P.jQuery(editorForm),
      this,
      this.parent.currentLibrary || ''
    );

    return editorForm;
  }

  /**
   * Collect functions to execute once the tree is complete.
   * @param {function} ready Function to execute.
   */
  ready(ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
  }

  /**
   * Look for field with given name in given collection.
   * @private
   * @param {string} name Name of field to look for.
   * @param {object[]} fields Collection to look in.
   * @return {object} Field object.
   */
  findField(name, fields) {
    return fields.find(field => field.name === name);
  }

  /**
   * Add confirmation dialog
   * @param {object} dialogOptions Dialog options.
   */
  showConfirmationDialog(dialogOptions, callbacks = {}) {
    const confirmationDialog = new H5P.ConfirmationDialog(dialogOptions)
      .appendTo(document.body);

    if (callbacks.cancelled) {
      confirmationDialog.on('cancelled', () => {
        callbacks.cancelled();
      });
    }

    if (callbacks.confirmed) {
      confirmationDialog.on('confirmed', () => {
        callbacks.confirmed();
      });
    }

    confirmationDialog.show();
  }
}
export default PortfolioPlaceholder;
