// import FormManager from './h5peditor-portfolio-placeholder-form-manager';
import LayoutSelector from './h5peditor-portfolio-placeholder-layout-selector';
import PortfolioPlaceholderPreview from './h5peditor-portfolio-placeholder-preview';
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

    // Fill dictionary
    Dictionary.fill({
      l10n: {
        done: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'done'),
        delete: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'delete'),
        expandBreadcrumb: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'expandBreadcrumb'),
        collapseBreadcrumb: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'collapseBreadcrumb'),
        confirmationDialogRemoveHeader: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveHeader'),
        confirmationDialogRemoveDialog: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveDialog'),
        confirmationDialogRemoveCancel: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveCancel'),
        confirmationDialogRemoveConfirm: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveConfirm')
      }
    });

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

    this.initialize();
  }

  /**
   * Initialize.
   */
  initialize() {
    this.fieldsLayout = this.findField('arrangement', this.field.fields);
    this.params.arrangement = this.params.arrangement || this.fieldsLayout.default || '1';

    // Add layout selector
    this.layoutSelector = new LayoutSelector(
      {
        layouts: this.fieldsLayout.options
      },
      {
        onLayoutChanged: (layout => {
          this.handleLayoutChanged(layout);
        })
      }
    );
    this.$container.get(0).appendChild(this.layoutSelector.getDOM());

    // Add preview
    this.preview = new PortfolioPlaceholderPreview(
      {
        layout: this.params.arrangement,
        semanticsChunk: (this.findField('fields', this.field.fields)).field.fields, // Make nicer
        params: this.params.fields, // Make nicer
        parent: this
      },
      {
        onGetCurrentLibrary: () => {
          return this.parent.currentLibrary || '';
        },
        onChanged: (fields) => {
          this.params.fields = fields;
        }
      }
    );
    this.$container.get(0).appendChild(this.preview.getDOM());

    if (this.params.arrangement) {
      this.layoutSelector.selectLayout(this.params.arrangement);
    }
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
   * Validate current values. Invoked by H5P core.
   * @return {boolean} True, if current value is valid, else false.
   */
  validate() {
    let validate = this.layoutSelector.validate();

    if (validate) {
      validate = this.preview.validate();
    }

    return validate;
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.remove();
  }

  /**
   * Handle layout changed.
   */
  handleLayoutChanged(layout) {
    this.params.arrangement = layout;
    this.preview.setLayout(layout);
    this.setValue(this.field, this.params);
    this.handleFieldChange();
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
