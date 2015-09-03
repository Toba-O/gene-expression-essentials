//  Copyright 2002-2014, University of Colorado Boulder
/**
 * Base class for elements in the model that change shape and/or move around.
 *
 * @author John Blanco
 * @author Mohamed Safi
 */
define( function( require ) {
  'use strict';

  //modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var PropertySet = require( 'AXON/PropertySet' );


  /**
   * @abstract
   * @param {Shape} initialShape
   * @constructor
   */
  function ShapeChangingModelElement( initialShape, props ) {
    PropertySet.call( this, _.extend( {
      // Shape property, which is not public because it should only be changed by descendants of the class.
      shape: initialShape
    }, props || {} ) );
  }

  return inherit( PropertySet, ShapeChangingModelElement, {

    /**
     *
     * @returns {Shape}
     */
    getShape: function() {
      return this.shapeProperty.get();
    },

    /**
     *
     * @param {Function} shapeChangeObserver
     */
    addShapeChangeObserver: function( shapeChangeObserver ) {
      this.shapeProperty.link( shapeChangeObserver );
    },

    /**
     *
     * @param {Function} shapeChangeObserver
     */
    removeShapeChangeObserver: function( shapeChangeObserver ) {
      this.shapeProperty.unlink( shapeChangeObserver );
    },

    /**
     *
     * @param {number} x
     * @param {number} y
     */
    translate: function( x, y ) {
      var translationTransform = null;
      if ( _.isFinite( x.x ) ) { // if x is a vector
        translationTransform = Matrix3.translation( x.x, x.y );
      }
      else {
        translationTransform = Matrix3.translation( x, y );
      }
      this.shapeProperty.set( this.shapeProperty.get().transformed( translationTransform ) );
    },


    /**
     *
     * @param {Vector2} newPos
     */
    setPosition: function( newPos ) {
      this.setPositionByXY( newPos.x, newPos.y );
    },

    /**
     *
     * @param {number} x
     * @param  {number} y
     */
    setPositionByXY: function( x, y ) {
      if ( x !== this.getPosition().x || y !== this.getPosition().y ) {

        // This default implementation assumes that the position indicator
        // is defined by the center of the shape's bounds.  Override if
        // some other behavior is required.
        var center = this.getCenter();
        this.translate( x - center.x,
          y - center.y );
      }
    },

    /**
     * The Java version of shape.bounds returns the center even if the shape has only a single point
     * the kite version gives NAN in such cases. This is a WorkAround. Needs Fixing. TODO
     */
    getCenter: function() {
      var center = this.shape.bounds.getCenter();
      if ( !_.isFinite( center.x ) ) {
        return this.shape.subpaths[ 0 ].points[ 0 ];
      }
      return center;
    },


    /**
     *
     * @returns {Vector2}
     */
    getPosition: function() {
      // Assumes that the center of the shape is the position.  Override if
      // other behavior is needed.
      return this.getCenter();
    }

  } );

} );
