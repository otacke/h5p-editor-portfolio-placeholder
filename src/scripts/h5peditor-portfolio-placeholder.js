// import FormManager from './h5peditor-portfolio-placeholder-form-manager';
import LayoutSelector from './components/h5peditor-portfolio-placeholder-layout-selector';
import PortfolioPlaceholderPreview from './components/h5peditor-portfolio-placeholder-preview';
import Dictionary from './services/dictionary';
import Util from './h5peditor-portfolio-placeholder-util';

/** Class for Portfolio Placeholder H5P widget */
class PortfolioPlaceholder {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params = {}, setValue) {
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
        confirmationDialogRemoveConfirm: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'confirmationDialogRemoveConfirm'),
        noPreviewPossible: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'noPreviewPossible')
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

    window.addEventListener('resize', () => {
      // Limit resizing
      clearTimeout(this.windowResizeListener);
      this.windowResizeListener = setTimeout(() => {
        this.preview.resize();
      }, 0);
    });
  }

  /**
   * Initialize.
   */
  initialize() {
    this.fieldsLayout = Util.findField('arrangement', this.field.fields);
    this.params.arrangement = this.params.arrangement || this.fieldsLayout.default || '1';

    // Add layout selector
    this.layoutSelector = new LayoutSelector(
      {
        layouts: this.fieldsLayout.options
      },
      {
        onLayoutChanged: ((layout) => {
          this.handleLayoutChanged(layout);
        })
      }
    );
    this.$container.get(0).appendChild(this.layoutSelector.getDOM());

    // Create list widget that holds infrastructure we can use
    const listWidget = new H5PEditor.widgets['list'](
      this,
      Util.findField('fields', this.field.fields),
      this.params.fields,
      this.setValue
    );

    // Add preview
    this.preview = new PortfolioPlaceholderPreview(
      {
        layout: this.params.arrangement,
        listWidget: listWidget
      },
      {
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
   *
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$wrapper = $wrapper;
    this.$container.appendTo($wrapper);

    /*
     * Library select field is set to display: none, disables copy/paste buttons
     */
    const librarySelect = this.$container.get(0).closest('.field.library').querySelector('select');
    librarySelect.style.display = '';
    librarySelect.style.visibility = 'hidden';
    librarySelect.style.width = '0';
    librarySelect.style.height = '1px';

    /*
     * Some content types need their containers to be attached to the
     * document DOM or they will not instantiate correctly.
     */
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio === 1) {
        this.observer.unobserve(this.$container.get(0)); // Only needed once.
        this.preview.updateInstances({ force: true });
      }
    }, {
      root: document.documentElement,
      threshold: [1]
    });
    this.observer.observe(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   *
   * @returns {boolean} True, if current value is valid, else false.
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
   *
   * @param {string} layout Layout as "1-2-3-4-...".
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
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Collect functions to execute once the tree is complete.
   *
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
}
export default PortfolioPlaceholder;
