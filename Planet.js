function Planet( camera, opts ) {

	this.$window = $( window );
	this.parent = $( "#container" ).get( 0 );
	this.$screenWidth = this.$window.width();
	this.$screenHeight = this.$window.height();

	this.camera = camera;
	this.opts = ( opts ) ? opts : {};
	this.radius = ( this.opts.radius ) ? this.opts.radius : 50;
	this.orbitRadius = ( this.opts.orbitRadius ) ? this.opts.orbitRadius : 300;
	this.phiOffset = ( this.opts.phiOffset ) ? this.opts.phiOffset : 0;
	this.thetaInit = ( this.opts.thetaInit ) ? this.opts.thetaInit : 0;
	this.declination = ( this.opts.declination ) ? this.opts.declination * ( Math.PI / 180 ) : 0;
	this.planetSpeed = ( this.opts.planetSpeed ) ? this.opts.planetSpeed : .5;
	this.color = ( this.opts.color ) ? this.opts.color : 0;

	this.thetaOffset = 0;
	this.targetThetaInit = this.thetaInit;
	this.targetThetaInit = this.declination;
	this.thetaOffsetSpeed = 0;

	//cache original values
	this.origThetaInit = this.thetaInit;
	this.origDeclination = this.declination;

	// create the sphere's material
    var sphereMaterial = new THREE.MeshLambertMaterial( { color: this.color } );
    var sphere = new THREE.Sphere( this.radius, 16, 16 );
    this.mesh = new THREE.Mesh( sphere, sphereMaterial );

    this.div = document.createElement( "p" );
    this.div.innerHTML = "text";
    this.parent.appendChild( this.div );
    this.div.style.position = "absolute";
}

Planet.prototype = {

	rotate : function( diffX, diffY ) {
	    
		var theta = ( this.thetaInit + this.thetaOffset ) * Math.PI / 180;
	    var orbit = this.orbitRadius + ( diffX + diffY ) / 15; 

	    this.mesh.position.x = orbit * Math.cos( theta ) * Math.sin( Math.PI/2 - this.declination );
	    this.mesh.position.y = orbit * Math.sin( this.declination ) * Math.cos( theta );
	    this.mesh.position.z = orbit * Math.sin( theta );
	    
	    //adjust rotation
	    this.thetaOffset += this.planetSpeed;

	    var projector = new THREE.Projector();
	    var vector = projector.projectVector( this.mesh.matrixWorld.getPosition().clone(), this.camera );
    	vector.x = ( vector.x * this.$screenWidth/2 ) + this.$screenWidth/2;
    	vector.y = - ( vector.y * this.$screenHeight/2 ) + this.$screenHeight/2;
    	this.div.style.left = vector.x + "px";
    	this.div.style.top = vector.y + "px";
	},

	setTargetThetaInit: function( value, dur ) {
		if( this.thetaInit > value ) {
			value += 360;
		}

		TweenLite.to( this, dur, { thetaInit: value } );
	},

	setTargetDeclination: function( value, dur ) {
		/*if( this.declination > value ) {
			value += 360;
		}*/

		TweenLite.to( this, dur, { declination: value } );
	}, 

	reset: function( dur ) {
		console.log( "reset", this.origThetaInit, this.origDeclination  );
		var value = this.origThetaInit;
		if( this.thetaInit > value ) {
			value += 360;
		}
		TweenLite.to( this, dur, { thetaInit: value } );
		TweenLite.to( this, dur, { declination: this.origDeclination } );
	}



}
