// import FormManager from './h5peditor-portfolio-placeholder-form-manager';
import LayoutSelector from './h5peditor-portfolio-placeholder-layout-selector';
import LayoutTemplate from './h5peditor-portfolio-placeholder-layout-template';
import FormManager from './h5peditor-portfolio-placeholder-form-manager';
import Dictionary from './services/dictionary';
import Util from './h5peditor-portfolio-placeholder-util';

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
    this.params = Util.extend({
      arrangement: '1',
      fields: []
    }, params);
    this.setValue = setValue;

    const l10n = {
      done: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'done'),
      delete: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'delete'),
      expandBreadcrumb: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'expandBreadcrumb'),
      collapseBreadcrumb: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'collapseBreadcrumb'),
      confirmationDialogRemoveHeader: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveHeader'),
      confirmationDialogRemoveDialog: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveDialog'),
      confirmationDialogRemoveCancel: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveCancel'),
      confirmationDialogRemoveConfirm: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveConfirm')
    };

    // Fill dictionary
    Dictionary.fill({ l10n: l10n });

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

    this.formManager = new FormManager(
      {
        parent: this.parent,
        customIconClass: 'portfolioplaceholder'
      }
    );

    this.initialize();
  }

  /**
   * Initialize.
   */
  initialize() {
    this.fieldsLayout = this.findField('arrangement', this.field.fields);
    this.params.arrangement = this.params.arrangement || this.fieldsLayout.default || '1';

    this.layoutSelector = new LayoutSelector(
      { layouts: this.fieldsLayout.options },
      {
        onLayoutChanged: (layoutId => {
          this.params.arrangement = layoutId;
          this.layoutTemplate.setLayout(this.params.arrangement);
          this.setValue(this.field, this.params);
          this.handleFieldChange();
        })
      }
    );

    // Add layout selector
    this.$container.get(0).appendChild(this.layoutSelector.getDOM());

    // Add contents
    this.contentsWrapper = document.createElement('div');
    this.contentsWrapper.classList.add('h5peditor-portfolio-placeholder-contents-wrapper');
    this.$container.get(0).appendChild(this.contentsWrapper);
    this.contentsWrapper.appendChild(this.buildContentsDOM());

    if (this.params.arrangement) {
      this.layoutSelector.selectLayout(this.params.arrangement);
    }
  }

  /**
   * Build Contents DOM.
   * @return {HTMLElement} Contents DOM.
   */
  buildContentsDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5peditor-portfolio-placeholder-contents');

    this.layoutTemplate = new LayoutTemplate(
      {},
      {
        onDoubleClicked: (buttonId => {
          this.handlePlaceholderClicked(buttonId);
        })
      }
    );

    this.updateInstances();
    this.layoutTemplate.setLayout(this.params.arrangement);

    contents.appendChild(this.layoutTemplate.getDOM());

    return contents;
  }

  updateInstances(id) {
    const contentFields = (typeof id === 'number') ?
      [this.params.fields[id]] :
      this.params.fields;

    contentFields.forEach((field, index) => {
      let instancePreview;

      if (field?.content?.library) {
        const instanceWrapper = document.createElement('div');
        instanceWrapper.classList.add('h5p-editor-placeholder-instance-wrapper');

        const instanceDOM = document.createElement('div');
        instanceDOM.classList.add('h5p-editor-placeholder-instance');
        instanceWrapper.appendChild(instanceDOM);

        const instanceBlocker = document.createElement('div');
        instanceBlocker.classList.add('h5p-editor-placeholder-instance-blocker');

        instancePreview = document.createElement('div');
        instancePreview.classList.add('h5p-editor-placeholder-instance-preview');
        if (field.isHidden) {
          instancePreview.classList.add('h5p-editor-placeholder-instance-hidden');
        }

        instancePreview.appendChild(instanceWrapper);
        instancePreview.appendChild(instanceBlocker);

        const instance = new H5P.newRunnable(
          field.content,
          H5PEditor.contentId,
          H5P.jQuery(instanceDOM),
          false,
          {}
        );

        const machineName = instance?.libraryInfo?.machineName;
        // TODO: This may need to be done for more content types ...
        if (machineName === 'H5P.Image') {
          window.addEventListener('resize', () => {
            this.layoutTemplate.resize();
          });
          instance.once('loaded', () => {
            this.layoutTemplate.resize();
          });
          this.layoutTemplate.resize();
        }

        instance.on('resize', () => {
          this.layoutTemplate.resize();
        });

        // Hide content elements from tab
        this.hideFromTab(instancePreview);
      }

      this.layoutTemplate.setButtonContent(
        (typeof id === 'number') ? id : index,
        instancePreview
      );
    });
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$wrapper = $wrapper;
    this.$container.appendTo($wrapper);

    /*
     * Library select field is set to display: none, disables copy/paste buttons
     * This is just a workaround. TODO: Investigate better option.
     */
    const librarySelect = this.$container.get(0).closest('.field.library').querySelector('select');
    librarySelect.style.display = '';
    librarySelect.style.visibility = 'collapse';
    librarySelect.style.opacity = 0;
  }

  /**
   * Hide element and all children from tab index.
   * @param {HTMLElement} element HTML element.
   */
  hideFromTab(element) {
    element.setAttribute('tabindex', '-1');
    [...element.children].forEach(child => {
      this.hideFromTab(child);
    });
  }

  handleInstanceResized(id) {
    this.layoutTemplate.resize(id);
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

    const handleFormRemove = (() => {
      this.formManager.getFormManager().closeFormUntil(0);
      this.params.fields[placeholderId] = { isHidden: false };
      this.updateInstances(placeholderId);
      this.layoutTemplate.setLayout(this.params.arrangement);
    }).bind(this);
    this.formManager.on('formremove', handleFormRemove);

    const handleFormDone = (() => {
      this.validate();
    }).bind(this);
    this.formManager.on('formdone', handleFormDone);

    const handleFormClose = (() => {
      this.formManager.off('formremove', handleFormRemove);
      this.formManager.off('formdone', handleFormDone);
      this.formManager.off('formclose', handleFormClose);

      // TODO: Refactor to use separate update function
      this.updateInstances();
      this.layoutTemplate.setLayout(this.params.arrangement);
      (this.layoutTemplate.getButton(placeholderId)).focus();
    }).bind(this);
    this.formManager.on('formclose', handleFormClose);

    const title = this.params.fields[placeholderId]?.content?.metadata?.title ||
      this.params.fields[placeholderId]?.content?.metadata?.contentType;

    const libraryField = this.params.fields[placeholderId]?.content?.library ?
      { params: this.params.fields[placeholderId]?.content } :
      { params: {
        library: 'H5P.notset 1.0',
        metadata: { title: '-' } }
      };

    // TODO: Focus on first field after opening

    this.formManager.openForm(
      libraryField,
      form,
      null,
      title
    );
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

    // TODO: This should be handled differently
    this.formInstance = {
      passReadies: true,
      ready: (() => {}),
      parent: this,
      field: {
        type: 'group'
      }
    };

    // Render element fields to form in DOM
    H5PEditor.processSemanticsChunk(
      elementFields,
      this.params.fields[id],
      H5P.jQuery(editorForm),
      this.formInstance,
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
}
export default PortfolioPlaceholder;
