import React from 'react';
import { PropTypes } from 'prop-types';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import { Map } from 'immutable';
import Switch from 'react-toggle-switch';
import 'react-toggle-switch/dist/css/switch.min.css';
import PopoverQuestion from '../PopoverQuestion/PopoverQuestion';
import PopoverLink from '../PopoverLink/PopoverLink';
import CardNumberField from '../CardNumberField/CardNumberField';
import * as tabKeycardType from '../../constants/keycardsType';
import * as MaskHelper from '../../helpers/MaskHelper';
import {
  isCurrentCardNumberType,
  getCurrentCardNumberValue,
  isCurrentCardNumberValid,
  getCardNumberTypes,
  getCardNumberTypeElementProperty,
  canCheckSwissPass,
  isSwissPassZipCodeValid,
} from '../../helpers/CardTypeHelper';

/**
 * Keycard
 */
class KeyCard extends React.Component {
  /**
   * Display Error Message
   * @param errorKey
   * @param localItemInfo
   * @returns {*}
   */
  static renderedErrorInputMessage(errorKey, localItemInfo) {
    const error = localItemInfo.get('errors', new Map()).get(errorKey, '');
    return <p className="errorInputKeyCard">{error}</p>;
  }

  /**
   * Constructor
   * @param props
   */
  constructor(props) {
    super(props);

    this.state = {
      checkYes: !props.hasSupport,
      checkNo: props.hasSupport,
      hasSupport: props.hasSupport,
      valid: true,
    };
    this.handleChangeCardNumber = this.handleChangeCardNumber.bind(this);
    this.handleChangeAutoSuggestCardNumber = this.handleChangeAutoSuggestCardNumber.bind(this);
    this.changeValidationCard = this.changeValidationCard.bind(this);
    this.handleChangeCheckSwisspass = this.handleChangeCheckSwisspass.bind(this);
    this.handleChangeZipcode = this.handleChangeZipcode.bind(this);
  }

  /**
   * Change local state when click support change value
   * @param checked
   */
  handleChangeToggle(checked) {
    this.setState({
      checkYes: checked,
      checkNo: !checked,
      hasSupport: !checked,
    });
    this.props.onChangeCheck(checked ? 'yes' : 'no');
  }

  /**
   * Change card number
   *
   * @param event
   * @param type
   */
  handleChangeCardNumber(event, type) {
    this.handleChangeAutoSuggestCardNumber(event.target.value, type, false);
  }

  /**
   * handle Change Check Swisspass
   */
  handleChangeCheckSwisspass() {
    const type = 'swisspass';
    const property = 'checked';
    const currentId = this.props.localItemInfo.get('skierIndex');
    const newValue = !getCardNumberTypeElementProperty(this.props.localItemInfo, type, property);

    this.props.stateUpdateCardNumberTypeProperty(currentId, type, property, newValue);

    this.validateSwissPass();
  }

  /**
   * handle Change Zipcode
   * @param event
   */
  handleChangeZipcode(event) {
    const type = 'swisspass';
    const zipCode = event.target.value;
    const errorKey = 'data.swisspass.zipcode';

    const currentId = this.props.localItemInfo.get('skierIndex');
    this.props.stateUpdateCardNumberTypeProperty(currentId, type, 'zipcode', zipCode);

    const pattern = /^[0-9]{4}$/;
    const isValid = pattern.test(zipCode);
    this.props.stateUpdateCardNumberTypeProperty(currentId, type, 'zipcodeFormatValid', isValid);

    // Delete errors
    this.props.deleteKeyFieldsErrors(currentId, errorKey);

    if (!isValid) {
      const { formatMessage } = this.props.intl;
      const errorLabel = formatMessage({ id: 'rp.checkout.customize.swisspass.zipcode.invalid', defaultMessage: 'invalid' });
      this.props.updateFieldsErrors(currentId, errorKey, errorLabel);
    } else {
      this.validateSwissPass();
    }
  }

  validateSwissPass() {
    console.log('validateSwissPass');
    if (canCheckSwissPass(this.props.localItemInfo)) {
      console.log('check validate swisspass ...');
      const cardNumber = getCardNumberTypeElementProperty(this.props.localItemInfo, 'swisspass', 'number');
      const zipCode = getCardNumberTypeElementProperty(this.props.localItemInfo, 'swisspass', 'zipcode');
      const currentId = this.props.localItemInfo.get('skierIndex');
      this.props.validateKeycard(currentId, cardNumber, zipCode);
    }
  }

  /**
   *
   * @param cardnumber
   * @param type
   * @param suggest
   */
  handleChangeAutoSuggestCardNumber(cardnumber, type, suggest = true) {
    let newValue = '';
    const { formatMessage } = this.props.intl;
    const errorKey = 'data.cardNumber';
    const errorLabel = formatMessage({ id: 'rp.checkout.customize.cardnumber.invalid', defaultMessage: 'invalid' });
    const currentId = this.props.localItemInfo.get('skierIndex');
    const skierIndex = this.props.orderitem.get('skierIndex');

    let validKeycard = getCardNumberTypeElementProperty(this.props.localItemInfo, type, 'formatValid');

    if (cardnumber !== undefined && typeof cardnumber !== 'undefined') {
      // Remove spaces on card number
      cardnumber = cardnumber.replace(new RegExp(/( )|(_)/g), '');

      // Update others card types values
      getCardNumberTypes(this.props.localItemInfo).forEach((item, key) => {
        if (![type, 'swisspass'].includes(key)) {
          if (suggest) {
            this.props.keycards.forEach((element) => {
              if (element.get('shortnumber') === cardnumber || element.get('cardnumber') === cardnumber) {
                newValue = type === 'sd' ? element.get('shortnumber') : element.get('cardnumber');
              }
            });
          }
          this.props.stateUpdateCardNumberTypeProperty(skierIndex, key, 'number', newValue);
        }
      });

      // Delete errors
      this.props.deleteKeyFieldsErrors(currentId, errorKey);

      const cardType = tabKeycardType[type];
      const isSwissPass = isCurrentCardNumberType(this.props.localItemInfo, 'swisspass');

      // verification keycard number is correct
      if (cardnumber !== '' || cardnumber !== undefined) {
        validKeycard = MaskHelper.verifyKeycard(cardnumber, cardType);

        this.props.stateUpdateCardNumberTypeProperty(skierIndex, type, 'formatValid', validKeycard);
        this.changeValidationCard(validKeycard);

        // Keycard mask is valid
        if (validKeycard) {
          // If no swisspass, we can validate keycard
          if (!isSwissPass) {
            this.props.validateKeycard(currentId, cardnumber);
          } else {
            this.validateSwissPass();
          }
        } else {
          this.props.updateFieldsErrors(currentId, errorKey, errorLabel);
        }
      } else {
        this.props.updateFieldsErrors(currentId, errorKey, errorLabel);
      }

      // Save cardNumber value
      this.props.stateUpdateCardNumberTypeProperty(skierIndex, type, 'number', cardnumber);
    }
  }

  /**
   *
   * @param value
   */
  changeValidationCard(value) {
    this.setState({ valid: value });
  }

  /**
   * Content for popover link
   * @returns {*}
   */
  renderedLabelLinkPopover() {
    return this.props.popoverLink.get('labelKeycardInfo') !== null
      ? <PopoverLink popoverLink={this.props.popoverLink} index={this.props.orderitem.get('skierIndex')} />
      : '';
  }

  /**
   * Render keycard types content (choice or not)
   *
   * @param keycardTypes
   * @returns {XML}
   */
  renderedKeyCardTypesContent(keycardTypes) {
    return (keycardTypes.size > 1
      ? ( // Display Double Mask KeyCard
        <div>
          <ul className="nav nav-tabs nav-justified responsive-tabs" role="tablist">
            { keycardTypes.map((data, type) => (
              this.renderedLabelTab(tabKeycardType[type], type)
            )) }
          </ul>
          <div className="tab-content">
            {
              keycardTypes.map((data, type) => (
                this.renderedSomeInputKeyCards(type)
              ))
            }
          </div>
        </div>
      )
      :
      (
        // Display one Input for keyCard
        this.renderedInputOneKeyCard(keycardTypes.first())
      )
    );
  }

  /**
   * Display of the simple input mask
   *
   * @param type
   * @returns {*}
   */
  renderedInputOneKeyCard(type) {
    let validKeycard = false;
    const errorKey = 'data.cardNumber';
    const { formatMessage } = this.props.intl;
    const errorLabel = formatMessage({ id: 'rp.checkout.customize.cardnumber.invalid', defaultMessage: 'empty' });
    const currentId = this.props.localItemInfo.get('skierIndex');
    let cardNumber = getCurrentCardNumberValue(this.props.localItemInfo);

    if (cardNumber === null || typeof cardNumber === 'undefined') {
      cardNumber = '';
    }

    // Change current cardNumber type
    this.props.updateCurrentCardNumberType(currentId, type);
    /*
        if (cardNumber !== '') {
          validKeycard = MaskHelper.verifyKeycard(cardNumber, index, tabKeycardType[type]);
          if (validKeycard) {
            this.props.validateKeycard(currentId, cardNumber);
            this.props.deleteKeyFieldsErrors(currentId, errorKey);
          }
        } else {
          this.props.updateFieldsErrors(currentId, errorKey, errorLabel);
        }
    */
    return (
      <div key={type}>
        { this.renderedCardNumberField(type, cardNumber) }
        { this.state.checkYes ? this.renderedLabelLinkPopover() : '' }
        {
          cardNumber === '' || !isCurrentCardNumberValid(this.props.localItemInfo)
            ? KeyCard.renderedErrorInputMessage(errorKey, this.props.localItemInfo)
            : '' }
      </div>
    );
  }

  /**
   * Display labels for inputs - select active input
   * @returns {XML}
   * @param textType
   * @param type
   */
  renderedLabelTab(textType, type) {
    let className = 'nav-item';
    if (isCurrentCardNumberType(this.props.localItemInfo, type)) {
      className = `${className} active`;
    }

    return (
      <li className={className} key={type}>
        <a
          className="nav-link text-center"
          data-toggle="tab"
          role="tab"
          href={`type${type}`}
          onClick={() => {
            // Change current cardNumber type
            this.props.updateCurrentCardNumberType(this.props.localItemInfo.get('skierIndex'), type);
          }}
        >{textType}</a>
      </li>
    );
  }

  /**
   * Display of the double input mask
   *
   * @param type
   * @returns {XML}
   */
  renderedSomeInputKeyCards(type) {
    let className = 'tab-pane fade in';
    const aux = `tabKeycardType[type]${type}`;
    const errorKey = 'data.cardNumber';
    let cardNumber = getCurrentCardNumberValue(this.props.localItemInfo);

    if (cardNumber === null || typeof cardNumber === 'undefined') {
      cardNumber = '';
    }

    // Remove spaces on card number
    cardNumber = cardNumber.replace(new RegExp(/( )|(_)/g), '');

    const isCurrentType = isCurrentCardNumberType(this.props.localItemInfo, type);

    // active tab on select
    if (isCurrentType) {
      className = `${className} active`;
    }

    return (
      <div className={className} id={aux} role="tabpanel" key={type}>
        { this.renderedCardNumberField(type, cardNumber) }
        { this.state.checkYes ? this.renderedLabelLinkPopover() : '' }
        {
          cardNumber === '' || !isCurrentCardNumberValid(this.props.localItemInfo)
            ? KeyCard.renderedErrorInputMessage(errorKey, this.props.localItemInfo)
            : ''
        }
        {
          isCurrentCardNumberType(this.props.localItemInfo, 'swisspass')
            ? this.renderedContentForSwisspass()
            : null
        }
      </div>
    );
  }

  /**
   * Render a cardNumber field
   *
   * @param type
   * @param cardNumber
   */
  renderedCardNumberField(type, cardNumber) {
    return (
      <CardNumberField
        key={type}
        id={type}
        validInput={this.state.valid}
        mode={tabKeycardType[type]}
        keycards={this.props.keycards}
        handleChangeCardNumber={(event) => {
          this.handleChangeCardNumber(event, type);
        }}
        onChange={(event) => {
          this.handleChangeCardNumber(event, type);
        }}
        onAutoSuggestSelected={(number) => {
          this.handleChangeAutoSuggestCardNumber(number, type);
        }}
        cardNumber={cardNumber}
        value={cardNumber}
        params={this.props.params}
      />
    );
  }

  /**
   * Display content checked no
   * @returns {*}
   */
  renderedContentCheckNo() {
    return (this.state.checkNo
      ? <div className="msgCheckNo">
        <p>
          <FormattedMessage id="rp.checkout.ordercustom.nokeycard" defaultMessage="no card" />
        </p>
      </div>
      : ''
    );
  }

  /**
   *
   * @returns {null}
   */
  renderedContentForSwisspass() {
    return (<div className="contentSwisspass">
      <input
        type="text"
        name="zipcode-swiss"
        id="zipcode-swiss"
        className="form-control"
        maxLength="4"
        data-control="true"
        onChange={event => this.handleChangeZipcode(event)}
        value={getCardNumberTypeElementProperty(this.props.localItemInfo, 'swisspass', 'zipcode')}
      />
      <label htmlFor="zipcode-swiss">
        <FormattedMessage id="rp.checkout.shippingaddress.zipcode" defaultMessage="Zipcode" />
      </label>
      {
        !isSwissPassZipCodeValid(this.props.localItemInfo)
          ? KeyCard.renderedErrorInputMessage('data.swisspass.zipcode', this.props.localItemInfo)
          : ''
      }
      <input
        type="checkbox"
        // value={CardTypeHelper.getSwissPassProperty(this.props.localItemInfo, 'checked') === true ? '1' : '0'}
        checked={getCardNumberTypeElementProperty(this.props.localItemInfo, 'swisspass', 'checked')}
        name="check-swisspass"
        id="check-swisspass"
        // onChange={() => this.handleChangeCheckSwisspass()}
        onClick={() => this.handleChangeCheckSwisspass()}
      />
      <label htmlFor="check-swisspass" onChange={() => this.handleChangeCheckSwisspass()}>
        <FormattedMessage id="rp.checkout.keycard.swisspass.check.text" defaultMessage="I agree with the conditions of SwissPass" />
      </label>
      <button className="btn-swisspass">
        <FormattedMessage id="rp.checkout.keycard.swisspass.link" defaultMessage="Disclaimer" />
      </button>
    </div>
    );
  }

  render() {
    const { id, keycardPictureSrc, keycardTypes, fields, popover } = this.props;
    const { hasSupport } = this.state;

    return (
      <div className="blockPopover" key={id}>

        <div className="col-xs-4 keyCardAreaImage">
          <img src={keycardPictureSrc} alt="keycardPicture" />
        </div>
        <div className="row">
          <form className="col-xs-12">
            <div>
              <div className="keycard_area_title">
                <div className="keycardMessage">
                  <FormattedMessage id="rp.checkout.keycard.area.question" defaultMessage="I have a card" />
                  <PopoverQuestion popover={popover} index={this.props.orderitem.get('skierIndex')} />
                </div>
                {fields.get('cardNumber').get('hasSupport', false) === true ?
                  <Switch
                    on={!hasSupport}
                    onClick={() => {
                      this.handleChangeToggle(hasSupport);
                    }}
                  />
                  : ''
                }
              </div>
            </div>

            <div>
              <div className="col-xs-8 form-group keyCardAreaForm">
                { this.renderedContentCheckNo() }

                {this.state.checkYes
                  ? <div className="msgCheckYes">
                    { this.renderedKeyCardTypesContent(keycardTypes) }
                  </div>
                  : ''}
              </div>
            </div>
          </form>
        </div>

      </div>
    );
  }
}

KeyCard.propTypes = {
  id: PropTypes.string.isRequired, // index
  keycardPictureSrc: PropTypes.string.isRequired, // keycard picture src
  keycardTypes: PropTypes.object.isRequired, // keycards to display the tabs
  keycards: PropTypes.object.isRequired,
  params: PropTypes.object.isRequired, // generic params
  orderitem: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  popover: PropTypes.object.isRequired, // content for popover info keycard
  popoverLink: PropTypes.object.isRequired, // content for popover link keycard
  localItemInfo: PropTypes.object.isRequired, // current local Item
  onChangeCheck: PropTypes.func.isRequired, // function to make changes when checking
  updateFieldsErrors: PropTypes.func.isRequired, // function to update fields errors
  deleteKeyFieldsErrors: PropTypes.func.isRequired, // function to delete key on fields errors
  updateCurrentCardNumberType: PropTypes.func.isRequired, // function to update current cardNumber type
  // validateKeycard: function call api for verification of keycard number
  validateKeycard: PropTypes.func.isRequired,
  updateValidField: PropTypes.func.isRequired, //
  hasSupport: PropTypes.bool.isRequired, // boolean to know if support exists
  intl: intlShape.isRequired, // for the internationalization
  stateUpdateCardNumberTypeProperty: PropTypes.func.isRequired, // function to update cardNumber property value
};

export default injectIntl(KeyCard);
