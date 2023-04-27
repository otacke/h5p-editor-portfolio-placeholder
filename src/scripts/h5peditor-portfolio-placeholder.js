import Color from 'color';
import LayoutSelector from '@components/h5peditor-portfolio-placeholder-layout-selector';
import PortfolioPlaceholderPreview from '@components/preview/h5peditor-portfolio-placeholder-preview';
import Dictionary from '@services/dictionary';
import Util from '@services/util';

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
      colorEditorField: '#1768c4',
      arrangement: '1',
      fields: []
    }, params);
    this.setValue = setValue;

    // Sanitize parameters
    this.params.fields = this.params.fields.map((field) => {
      field.width = field.width ?? 100;
      return field;
    });

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
      },
      a11y: {
        sizeSliderLabel: H5PEditor.t('H5PEditor.PortfolioPlaceholder', 'changeContentsWidth'),
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

      if (this.parent.field?.portfolioPlaceholder?.colorSelector) {
        this.initTitleBarColor();
      }
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

    // Listen for delete call
    H5P.externalDispatcher.on(
      'H5PEditor.PortfolioPlaceholder:deleteHidden', () => {
        this.preview.deleteHidden();
        this.preview.updateInstances({ force: true });
      }
    );
  }

  /**
   * Initialize.
   */
  initialize() {
    // Instantiate original field
    this.fieldInstance = new H5PEditor.widgets[this.field.type](
      this.parent, this.field, this.params, this.setValue
    );
    this.fieldInstance.appendTo(H5P.jQuery(document.createElement('div')));

    // Attach color selector widget to custom dom if requested
    if (this.parent.field?.portfolioPlaceholder?.colorSelector) {
      this.colorSelectorInstance = Util.findInstance('colorEditorField', this.fieldInstance);
      if (this.colorSelectorInstance) {
        this.colorSelectorInstance.appendTo(this.$container);
      }
    }

    this.fieldsLayout = Util.findField('arrangement', this.field.fields);
    this.params.arrangement = this.params.arrangement || this.fieldsLayout.default || '1';

    // Add layout selector
    this.layoutSelector = new LayoutSelector(
      {
        layouts: this.fieldsLayout.options
      },
      {
        onLayoutChanged: ((params) => {
          if (params.reset) {
            this.resetGrowHorizonzals();
          }

          this.handleLayoutChanged(params.layout);
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
          this.setValue(this.field, this.params);
        }
      }
    );
    this.$container.get(0).appendChild(this.preview.getDOM());

    if (this.params.arrangement) {
      this.layoutSelector.selectLayout(this.params.arrangement);
    }

    const chapterEditor = Util.findParentLibrary('PortfolioChapter', this);
    if (chapterEditor) {
      chapterEditor.handlePlaceholderDone(this.parent?.params?.subContentId);
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
   * Initialize title bar color.
   */
  initTitleBarColor() {
    if (!this.colorSelectorInstance) {
      return;
    }

    this.chapterTitleBar = this.parent.parent?.$title?.get(0)?.parentNode;
    if (!this.chapterTitleBar?.classList.contains('list-item-title-bar')) {
      this.chapterTitleBar = null;
    }

    if (this.chapterTitleBar) {
      this.chapterTitleBar
        .style.background = 'var(--title-background)';

      this.chapterTitleBar
        .style.borderColor = 'var(--title-border-color)';


      this.chapterTitleBar
        .querySelector(':scope > .h5peditor-label')
        .style.color = 'var(--title-color)';

      this.chapterTitleBar
        .querySelector('.list-actions')
        .style.color = 'var(--title-color)';

      this.chapterTitleBar
        .querySelector('.list-actions .order-group')
        .style.background = 'var(--title-background)';
    }

    this.colorSelectorInstance?.changes?.push(() => {
      // Not sure why the callback doesn't send the params directly
      this.updateEditorFieldColor();
    });

    this.updateEditorFieldColor();
  }

  /**
   * Update chapter title color in editor field.
   *
   */
  updateEditorFieldColor() {
    if (!this.colorSelectorInstance || !this.chapterTitleBar) {
      return;
    }

    // Not sure why ColorSelector changed callback doesn't send params = color
    const color = Color(this.colorSelectorInstance.params);

    this.chapterTitleBar.style.setProperty(
      '--title-background', color.hex()
    );

    this.chapterTitleBar.style.setProperty(
      '--title-border-color', color.darken(0.2).hex()
    );

    this.chapterTitleBar.style.setProperty(
      '--title-color',
      (color.isLight()) ? Color('black').hex() : Color('white').hex()
    );
  }

  /**
   * Reset grow horizontals of buttons.
   */
  resetGrowHorizonzals() {
    this.params.fields = this.params.fields.map((field) => {
      field.width = 100;
      return field;
    });
  }

  /**
   * Handle layout changed.
   * @param {string} layout Layout as "1-2-3-4-...".
   */
  handleLayoutChanged(layout) {
    this.params.arrangement = layout;
    this.preview.setLayout({
      layout: layout,
      widths: this.params.fields.map((field) => field.width)
    });

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
