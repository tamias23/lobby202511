// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$AppUser {

 String get id; String get username; String get role; double? get rating; String? get token;
/// Create a copy of AppUser
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AppUserCopyWith<AppUser> get copyWith => _$AppUserCopyWithImpl<AppUser>(this as AppUser, _$identity);

  /// Serializes this AppUser to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AppUser&&(identical(other.id, id) || other.id == id)&&(identical(other.username, username) || other.username == username)&&(identical(other.role, role) || other.role == role)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.token, token) || other.token == token));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,username,role,rating,token);

@override
String toString() {
  return 'AppUser(id: $id, username: $username, role: $role, rating: $rating, token: $token)';
}


}

/// @nodoc
abstract mixin class $AppUserCopyWith<$Res>  {
  factory $AppUserCopyWith(AppUser value, $Res Function(AppUser) _then) = _$AppUserCopyWithImpl;
@useResult
$Res call({
 String id, String username, String role, double? rating, String? token
});




}
/// @nodoc
class _$AppUserCopyWithImpl<$Res>
    implements $AppUserCopyWith<$Res> {
  _$AppUserCopyWithImpl(this._self, this._then);

  final AppUser _self;
  final $Res Function(AppUser) _then;

/// Create a copy of AppUser
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? username = null,Object? role = null,Object? rating = freezed,Object? token = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,username: null == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String,rating: freezed == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double?,token: freezed == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AppUser].
extension AppUserPatterns on AppUser {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AppUser value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AppUser() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AppUser value)  $default,){
final _that = this;
switch (_that) {
case _AppUser():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AppUser value)?  $default,){
final _that = this;
switch (_that) {
case _AppUser() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String username,  String role,  double? rating,  String? token)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AppUser() when $default != null:
return $default(_that.id,_that.username,_that.role,_that.rating,_that.token);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String username,  String role,  double? rating,  String? token)  $default,) {final _that = this;
switch (_that) {
case _AppUser():
return $default(_that.id,_that.username,_that.role,_that.rating,_that.token);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String username,  String role,  double? rating,  String? token)?  $default,) {final _that = this;
switch (_that) {
case _AppUser() when $default != null:
return $default(_that.id,_that.username,_that.role,_that.rating,_that.token);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AppUser implements AppUser {
  const _AppUser({required this.id, required this.username, this.role = 'guest', this.rating, this.token});
  factory _AppUser.fromJson(Map<String, dynamic> json) => _$AppUserFromJson(json);

@override final  String id;
@override final  String username;
@override@JsonKey() final  String role;
@override final  double? rating;
@override final  String? token;

/// Create a copy of AppUser
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AppUserCopyWith<_AppUser> get copyWith => __$AppUserCopyWithImpl<_AppUser>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AppUserToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AppUser&&(identical(other.id, id) || other.id == id)&&(identical(other.username, username) || other.username == username)&&(identical(other.role, role) || other.role == role)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.token, token) || other.token == token));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,username,role,rating,token);

@override
String toString() {
  return 'AppUser(id: $id, username: $username, role: $role, rating: $rating, token: $token)';
}


}

/// @nodoc
abstract mixin class _$AppUserCopyWith<$Res> implements $AppUserCopyWith<$Res> {
  factory _$AppUserCopyWith(_AppUser value, $Res Function(_AppUser) _then) = __$AppUserCopyWithImpl;
@override @useResult
$Res call({
 String id, String username, String role, double? rating, String? token
});




}
/// @nodoc
class __$AppUserCopyWithImpl<$Res>
    implements _$AppUserCopyWith<$Res> {
  __$AppUserCopyWithImpl(this._self, this._then);

  final _AppUser _self;
  final $Res Function(_AppUser) _then;

/// Create a copy of AppUser
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? username = null,Object? role = null,Object? rating = freezed,Object? token = freezed,}) {
  return _then(_AppUser(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,username: null == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String,rating: freezed == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double?,token: freezed == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$Piece {

 String get id; String get type;// goddess | heroe | mage | witch | soldier | minotaur | siren | ghoul
 String get side;// white | black
 String get position;
/// Create a copy of Piece
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PieceCopyWith<Piece> get copyWith => _$PieceCopyWithImpl<Piece>(this as Piece, _$identity);

  /// Serializes this Piece to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Piece&&(identical(other.id, id) || other.id == id)&&(identical(other.type, type) || other.type == type)&&(identical(other.side, side) || other.side == side)&&(identical(other.position, position) || other.position == position));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,type,side,position);

@override
String toString() {
  return 'Piece(id: $id, type: $type, side: $side, position: $position)';
}


}

/// @nodoc
abstract mixin class $PieceCopyWith<$Res>  {
  factory $PieceCopyWith(Piece value, $Res Function(Piece) _then) = _$PieceCopyWithImpl;
@useResult
$Res call({
 String id, String type, String side, String position
});




}
/// @nodoc
class _$PieceCopyWithImpl<$Res>
    implements $PieceCopyWith<$Res> {
  _$PieceCopyWithImpl(this._self, this._then);

  final Piece _self;
  final $Res Function(Piece) _then;

/// Create a copy of Piece
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? type = null,Object? side = null,Object? position = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,side: null == side ? _self.side : side // ignore: cast_nullable_to_non_nullable
as String,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Piece].
extension PiecePatterns on Piece {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Piece value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Piece() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Piece value)  $default,){
final _that = this;
switch (_that) {
case _Piece():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Piece value)?  $default,){
final _that = this;
switch (_that) {
case _Piece() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String type,  String side,  String position)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Piece() when $default != null:
return $default(_that.id,_that.type,_that.side,_that.position);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String type,  String side,  String position)  $default,) {final _that = this;
switch (_that) {
case _Piece():
return $default(_that.id,_that.type,_that.side,_that.position);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String type,  String side,  String position)?  $default,) {final _that = this;
switch (_that) {
case _Piece() when $default != null:
return $default(_that.id,_that.type,_that.side,_that.position);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Piece implements Piece {
  const _Piece({required this.id, required this.type, required this.side, required this.position});
  factory _Piece.fromJson(Map<String, dynamic> json) => _$PieceFromJson(json);

@override final  String id;
@override final  String type;
// goddess | heroe | mage | witch | soldier | minotaur | siren | ghoul
@override final  String side;
// white | black
@override final  String position;

/// Create a copy of Piece
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PieceCopyWith<_Piece> get copyWith => __$PieceCopyWithImpl<_Piece>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PieceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Piece&&(identical(other.id, id) || other.id == id)&&(identical(other.type, type) || other.type == type)&&(identical(other.side, side) || other.side == side)&&(identical(other.position, position) || other.position == position));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,type,side,position);

@override
String toString() {
  return 'Piece(id: $id, type: $type, side: $side, position: $position)';
}


}

/// @nodoc
abstract mixin class _$PieceCopyWith<$Res> implements $PieceCopyWith<$Res> {
  factory _$PieceCopyWith(_Piece value, $Res Function(_Piece) _then) = __$PieceCopyWithImpl;
@override @useResult
$Res call({
 String id, String type, String side, String position
});




}
/// @nodoc
class __$PieceCopyWithImpl<$Res>
    implements _$PieceCopyWith<$Res> {
  __$PieceCopyWithImpl(this._self, this._then);

  final _Piece _self;
  final $Res Function(_Piece) _then;

/// Create a copy of Piece
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? type = null,Object? side = null,Object? position = null,}) {
  return _then(_Piece(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,side: null == side ? _self.side : side // ignore: cast_nullable_to_non_nullable
as String,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$BoardPolygon {

 int get id; String get name; String get color;// orange | green | blue | grey
 List<List<double>> get points; List<double> get center; List<String> get neighbors;// jump neighbors
 List<String> get neighbours;// slide neighbors
 String get shape;
/// Create a copy of BoardPolygon
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BoardPolygonCopyWith<BoardPolygon> get copyWith => _$BoardPolygonCopyWithImpl<BoardPolygon>(this as BoardPolygon, _$identity);

  /// Serializes this BoardPolygon to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BoardPolygon&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.color, color) || other.color == color)&&const DeepCollectionEquality().equals(other.points, points)&&const DeepCollectionEquality().equals(other.center, center)&&const DeepCollectionEquality().equals(other.neighbors, neighbors)&&const DeepCollectionEquality().equals(other.neighbours, neighbours)&&(identical(other.shape, shape) || other.shape == shape));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,color,const DeepCollectionEquality().hash(points),const DeepCollectionEquality().hash(center),const DeepCollectionEquality().hash(neighbors),const DeepCollectionEquality().hash(neighbours),shape);

@override
String toString() {
  return 'BoardPolygon(id: $id, name: $name, color: $color, points: $points, center: $center, neighbors: $neighbors, neighbours: $neighbours, shape: $shape)';
}


}

/// @nodoc
abstract mixin class $BoardPolygonCopyWith<$Res>  {
  factory $BoardPolygonCopyWith(BoardPolygon value, $Res Function(BoardPolygon) _then) = _$BoardPolygonCopyWithImpl;
@useResult
$Res call({
 int id, String name, String color, List<List<double>> points, List<double> center, List<String> neighbors, List<String> neighbours, String shape
});




}
/// @nodoc
class _$BoardPolygonCopyWithImpl<$Res>
    implements $BoardPolygonCopyWith<$Res> {
  _$BoardPolygonCopyWithImpl(this._self, this._then);

  final BoardPolygon _self;
  final $Res Function(BoardPolygon) _then;

/// Create a copy of BoardPolygon
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? color = null,Object? points = null,Object? center = null,Object? neighbors = null,Object? neighbours = null,Object? shape = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,color: null == color ? _self.color : color // ignore: cast_nullable_to_non_nullable
as String,points: null == points ? _self.points : points // ignore: cast_nullable_to_non_nullable
as List<List<double>>,center: null == center ? _self.center : center // ignore: cast_nullable_to_non_nullable
as List<double>,neighbors: null == neighbors ? _self.neighbors : neighbors // ignore: cast_nullable_to_non_nullable
as List<String>,neighbours: null == neighbours ? _self.neighbours : neighbours // ignore: cast_nullable_to_non_nullable
as List<String>,shape: null == shape ? _self.shape : shape // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [BoardPolygon].
extension BoardPolygonPatterns on BoardPolygon {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BoardPolygon value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BoardPolygon() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BoardPolygon value)  $default,){
final _that = this;
switch (_that) {
case _BoardPolygon():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BoardPolygon value)?  $default,){
final _that = this;
switch (_that) {
case _BoardPolygon() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String name,  String color,  List<List<double>> points,  List<double> center,  List<String> neighbors,  List<String> neighbours,  String shape)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BoardPolygon() when $default != null:
return $default(_that.id,_that.name,_that.color,_that.points,_that.center,_that.neighbors,_that.neighbours,_that.shape);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String name,  String color,  List<List<double>> points,  List<double> center,  List<String> neighbors,  List<String> neighbours,  String shape)  $default,) {final _that = this;
switch (_that) {
case _BoardPolygon():
return $default(_that.id,_that.name,_that.color,_that.points,_that.center,_that.neighbors,_that.neighbours,_that.shape);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String name,  String color,  List<List<double>> points,  List<double> center,  List<String> neighbors,  List<String> neighbours,  String shape)?  $default,) {final _that = this;
switch (_that) {
case _BoardPolygon() when $default != null:
return $default(_that.id,_that.name,_that.color,_that.points,_that.center,_that.neighbors,_that.neighbours,_that.shape);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BoardPolygon implements BoardPolygon {
  const _BoardPolygon({required this.id, required this.name, required this.color, required final  List<List<double>> points, required final  List<double> center, final  List<String> neighbors = const [], final  List<String> neighbours = const [], this.shape = 'hexagon'}): _points = points,_center = center,_neighbors = neighbors,_neighbours = neighbours;
  factory _BoardPolygon.fromJson(Map<String, dynamic> json) => _$BoardPolygonFromJson(json);

@override final  int id;
@override final  String name;
@override final  String color;
// orange | green | blue | grey
 final  List<List<double>> _points;
// orange | green | blue | grey
@override List<List<double>> get points {
  if (_points is EqualUnmodifiableListView) return _points;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_points);
}

 final  List<double> _center;
@override List<double> get center {
  if (_center is EqualUnmodifiableListView) return _center;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_center);
}

 final  List<String> _neighbors;
@override@JsonKey() List<String> get neighbors {
  if (_neighbors is EqualUnmodifiableListView) return _neighbors;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_neighbors);
}

// jump neighbors
 final  List<String> _neighbours;
// jump neighbors
@override@JsonKey() List<String> get neighbours {
  if (_neighbours is EqualUnmodifiableListView) return _neighbours;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_neighbours);
}

// slide neighbors
@override@JsonKey() final  String shape;

/// Create a copy of BoardPolygon
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BoardPolygonCopyWith<_BoardPolygon> get copyWith => __$BoardPolygonCopyWithImpl<_BoardPolygon>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BoardPolygonToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BoardPolygon&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.color, color) || other.color == color)&&const DeepCollectionEquality().equals(other._points, _points)&&const DeepCollectionEquality().equals(other._center, _center)&&const DeepCollectionEquality().equals(other._neighbors, _neighbors)&&const DeepCollectionEquality().equals(other._neighbours, _neighbours)&&(identical(other.shape, shape) || other.shape == shape));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,color,const DeepCollectionEquality().hash(_points),const DeepCollectionEquality().hash(_center),const DeepCollectionEquality().hash(_neighbors),const DeepCollectionEquality().hash(_neighbours),shape);

@override
String toString() {
  return 'BoardPolygon(id: $id, name: $name, color: $color, points: $points, center: $center, neighbors: $neighbors, neighbours: $neighbours, shape: $shape)';
}


}

/// @nodoc
abstract mixin class _$BoardPolygonCopyWith<$Res> implements $BoardPolygonCopyWith<$Res> {
  factory _$BoardPolygonCopyWith(_BoardPolygon value, $Res Function(_BoardPolygon) _then) = __$BoardPolygonCopyWithImpl;
@override @useResult
$Res call({
 int id, String name, String color, List<List<double>> points, List<double> center, List<String> neighbors, List<String> neighbours, String shape
});




}
/// @nodoc
class __$BoardPolygonCopyWithImpl<$Res>
    implements _$BoardPolygonCopyWith<$Res> {
  __$BoardPolygonCopyWithImpl(this._self, this._then);

  final _BoardPolygon _self;
  final $Res Function(_BoardPolygon) _then;

/// Create a copy of BoardPolygon
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? color = null,Object? points = null,Object? center = null,Object? neighbors = null,Object? neighbours = null,Object? shape = null,}) {
  return _then(_BoardPolygon(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,color: null == color ? _self.color : color // ignore: cast_nullable_to_non_nullable
as String,points: null == points ? _self._points : points // ignore: cast_nullable_to_non_nullable
as List<List<double>>,center: null == center ? _self._center : center // ignore: cast_nullable_to_non_nullable
as List<double>,neighbors: null == neighbors ? _self._neighbors : neighbors // ignore: cast_nullable_to_non_nullable
as List<String>,neighbours: null == neighbours ? _self._neighbours : neighbours // ignore: cast_nullable_to_non_nullable
as List<String>,shape: null == shape ? _self.shape : shape // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$GameState {

/// Raw board JSON — used by the Rust engine wrapper.
 Map<String, dynamic> get board; List<Piece> get pieces; String get turn;// 'white' | 'black'
 String get phase;// 'Setup' | 'ColorChoice' | 'Playing' | 'GameOver'
 int get setupStep; int get turnCounter; bool get isNewTurn; int get movesThisTurn; String? get lockedSequencePiece; int get heroeTakeCounter; Map<String, int> get clocks; int? get lastTurnTimestamp; Map<String, dynamic> get colorChosen; List<String> get colorsEverChosen; bool get mageUnlocked; Map<String, int> get passCount; List<Map<String, dynamic>> get moves;// Time control
 Map<String, dynamic>? get timeControl;// Player info
 String? get whiteName; String? get blackName; String? get whiteRole; String? get blackRole; double? get whiteRating; double? get blackRating; String? get boardName;// Role of this player
 String get side;
/// Create a copy of GameState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GameStateCopyWith<GameState> get copyWith => _$GameStateCopyWithImpl<GameState>(this as GameState, _$identity);

  /// Serializes this GameState to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GameState&&const DeepCollectionEquality().equals(other.board, board)&&const DeepCollectionEquality().equals(other.pieces, pieces)&&(identical(other.turn, turn) || other.turn == turn)&&(identical(other.phase, phase) || other.phase == phase)&&(identical(other.setupStep, setupStep) || other.setupStep == setupStep)&&(identical(other.turnCounter, turnCounter) || other.turnCounter == turnCounter)&&(identical(other.isNewTurn, isNewTurn) || other.isNewTurn == isNewTurn)&&(identical(other.movesThisTurn, movesThisTurn) || other.movesThisTurn == movesThisTurn)&&(identical(other.lockedSequencePiece, lockedSequencePiece) || other.lockedSequencePiece == lockedSequencePiece)&&(identical(other.heroeTakeCounter, heroeTakeCounter) || other.heroeTakeCounter == heroeTakeCounter)&&const DeepCollectionEquality().equals(other.clocks, clocks)&&(identical(other.lastTurnTimestamp, lastTurnTimestamp) || other.lastTurnTimestamp == lastTurnTimestamp)&&const DeepCollectionEquality().equals(other.colorChosen, colorChosen)&&const DeepCollectionEquality().equals(other.colorsEverChosen, colorsEverChosen)&&(identical(other.mageUnlocked, mageUnlocked) || other.mageUnlocked == mageUnlocked)&&const DeepCollectionEquality().equals(other.passCount, passCount)&&const DeepCollectionEquality().equals(other.moves, moves)&&const DeepCollectionEquality().equals(other.timeControl, timeControl)&&(identical(other.whiteName, whiteName) || other.whiteName == whiteName)&&(identical(other.blackName, blackName) || other.blackName == blackName)&&(identical(other.whiteRole, whiteRole) || other.whiteRole == whiteRole)&&(identical(other.blackRole, blackRole) || other.blackRole == blackRole)&&(identical(other.whiteRating, whiteRating) || other.whiteRating == whiteRating)&&(identical(other.blackRating, blackRating) || other.blackRating == blackRating)&&(identical(other.boardName, boardName) || other.boardName == boardName)&&(identical(other.side, side) || other.side == side));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,const DeepCollectionEquality().hash(board),const DeepCollectionEquality().hash(pieces),turn,phase,setupStep,turnCounter,isNewTurn,movesThisTurn,lockedSequencePiece,heroeTakeCounter,const DeepCollectionEquality().hash(clocks),lastTurnTimestamp,const DeepCollectionEquality().hash(colorChosen),const DeepCollectionEquality().hash(colorsEverChosen),mageUnlocked,const DeepCollectionEquality().hash(passCount),const DeepCollectionEquality().hash(moves),const DeepCollectionEquality().hash(timeControl),whiteName,blackName,whiteRole,blackRole,whiteRating,blackRating,boardName,side]);

@override
String toString() {
  return 'GameState(board: $board, pieces: $pieces, turn: $turn, phase: $phase, setupStep: $setupStep, turnCounter: $turnCounter, isNewTurn: $isNewTurn, movesThisTurn: $movesThisTurn, lockedSequencePiece: $lockedSequencePiece, heroeTakeCounter: $heroeTakeCounter, clocks: $clocks, lastTurnTimestamp: $lastTurnTimestamp, colorChosen: $colorChosen, colorsEverChosen: $colorsEverChosen, mageUnlocked: $mageUnlocked, passCount: $passCount, moves: $moves, timeControl: $timeControl, whiteName: $whiteName, blackName: $blackName, whiteRole: $whiteRole, blackRole: $blackRole, whiteRating: $whiteRating, blackRating: $blackRating, boardName: $boardName, side: $side)';
}


}

/// @nodoc
abstract mixin class $GameStateCopyWith<$Res>  {
  factory $GameStateCopyWith(GameState value, $Res Function(GameState) _then) = _$GameStateCopyWithImpl;
@useResult
$Res call({
 Map<String, dynamic> board, List<Piece> pieces, String turn, String phase, int setupStep, int turnCounter, bool isNewTurn, int movesThisTurn, String? lockedSequencePiece, int heroeTakeCounter, Map<String, int> clocks, int? lastTurnTimestamp, Map<String, dynamic> colorChosen, List<String> colorsEverChosen, bool mageUnlocked, Map<String, int> passCount, List<Map<String, dynamic>> moves, Map<String, dynamic>? timeControl, String? whiteName, String? blackName, String? whiteRole, String? blackRole, double? whiteRating, double? blackRating, String? boardName, String side
});




}
/// @nodoc
class _$GameStateCopyWithImpl<$Res>
    implements $GameStateCopyWith<$Res> {
  _$GameStateCopyWithImpl(this._self, this._then);

  final GameState _self;
  final $Res Function(GameState) _then;

/// Create a copy of GameState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? board = null,Object? pieces = null,Object? turn = null,Object? phase = null,Object? setupStep = null,Object? turnCounter = null,Object? isNewTurn = null,Object? movesThisTurn = null,Object? lockedSequencePiece = freezed,Object? heroeTakeCounter = null,Object? clocks = null,Object? lastTurnTimestamp = freezed,Object? colorChosen = null,Object? colorsEverChosen = null,Object? mageUnlocked = null,Object? passCount = null,Object? moves = null,Object? timeControl = freezed,Object? whiteName = freezed,Object? blackName = freezed,Object? whiteRole = freezed,Object? blackRole = freezed,Object? whiteRating = freezed,Object? blackRating = freezed,Object? boardName = freezed,Object? side = null,}) {
  return _then(_self.copyWith(
board: null == board ? _self.board : board // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,pieces: null == pieces ? _self.pieces : pieces // ignore: cast_nullable_to_non_nullable
as List<Piece>,turn: null == turn ? _self.turn : turn // ignore: cast_nullable_to_non_nullable
as String,phase: null == phase ? _self.phase : phase // ignore: cast_nullable_to_non_nullable
as String,setupStep: null == setupStep ? _self.setupStep : setupStep // ignore: cast_nullable_to_non_nullable
as int,turnCounter: null == turnCounter ? _self.turnCounter : turnCounter // ignore: cast_nullable_to_non_nullable
as int,isNewTurn: null == isNewTurn ? _self.isNewTurn : isNewTurn // ignore: cast_nullable_to_non_nullable
as bool,movesThisTurn: null == movesThisTurn ? _self.movesThisTurn : movesThisTurn // ignore: cast_nullable_to_non_nullable
as int,lockedSequencePiece: freezed == lockedSequencePiece ? _self.lockedSequencePiece : lockedSequencePiece // ignore: cast_nullable_to_non_nullable
as String?,heroeTakeCounter: null == heroeTakeCounter ? _self.heroeTakeCounter : heroeTakeCounter // ignore: cast_nullable_to_non_nullable
as int,clocks: null == clocks ? _self.clocks : clocks // ignore: cast_nullable_to_non_nullable
as Map<String, int>,lastTurnTimestamp: freezed == lastTurnTimestamp ? _self.lastTurnTimestamp : lastTurnTimestamp // ignore: cast_nullable_to_non_nullable
as int?,colorChosen: null == colorChosen ? _self.colorChosen : colorChosen // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,colorsEverChosen: null == colorsEverChosen ? _self.colorsEverChosen : colorsEverChosen // ignore: cast_nullable_to_non_nullable
as List<String>,mageUnlocked: null == mageUnlocked ? _self.mageUnlocked : mageUnlocked // ignore: cast_nullable_to_non_nullable
as bool,passCount: null == passCount ? _self.passCount : passCount // ignore: cast_nullable_to_non_nullable
as Map<String, int>,moves: null == moves ? _self.moves : moves // ignore: cast_nullable_to_non_nullable
as List<Map<String, dynamic>>,timeControl: freezed == timeControl ? _self.timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,whiteName: freezed == whiteName ? _self.whiteName : whiteName // ignore: cast_nullable_to_non_nullable
as String?,blackName: freezed == blackName ? _self.blackName : blackName // ignore: cast_nullable_to_non_nullable
as String?,whiteRole: freezed == whiteRole ? _self.whiteRole : whiteRole // ignore: cast_nullable_to_non_nullable
as String?,blackRole: freezed == blackRole ? _self.blackRole : blackRole // ignore: cast_nullable_to_non_nullable
as String?,whiteRating: freezed == whiteRating ? _self.whiteRating : whiteRating // ignore: cast_nullable_to_non_nullable
as double?,blackRating: freezed == blackRating ? _self.blackRating : blackRating // ignore: cast_nullable_to_non_nullable
as double?,boardName: freezed == boardName ? _self.boardName : boardName // ignore: cast_nullable_to_non_nullable
as String?,side: null == side ? _self.side : side // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [GameState].
extension GameStatePatterns on GameState {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _GameState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _GameState() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _GameState value)  $default,){
final _that = this;
switch (_that) {
case _GameState():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _GameState value)?  $default,){
final _that = this;
switch (_that) {
case _GameState() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Map<String, dynamic> board,  List<Piece> pieces,  String turn,  String phase,  int setupStep,  int turnCounter,  bool isNewTurn,  int movesThisTurn,  String? lockedSequencePiece,  int heroeTakeCounter,  Map<String, int> clocks,  int? lastTurnTimestamp,  Map<String, dynamic> colorChosen,  List<String> colorsEverChosen,  bool mageUnlocked,  Map<String, int> passCount,  List<Map<String, dynamic>> moves,  Map<String, dynamic>? timeControl,  String? whiteName,  String? blackName,  String? whiteRole,  String? blackRole,  double? whiteRating,  double? blackRating,  String? boardName,  String side)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _GameState() when $default != null:
return $default(_that.board,_that.pieces,_that.turn,_that.phase,_that.setupStep,_that.turnCounter,_that.isNewTurn,_that.movesThisTurn,_that.lockedSequencePiece,_that.heroeTakeCounter,_that.clocks,_that.lastTurnTimestamp,_that.colorChosen,_that.colorsEverChosen,_that.mageUnlocked,_that.passCount,_that.moves,_that.timeControl,_that.whiteName,_that.blackName,_that.whiteRole,_that.blackRole,_that.whiteRating,_that.blackRating,_that.boardName,_that.side);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Map<String, dynamic> board,  List<Piece> pieces,  String turn,  String phase,  int setupStep,  int turnCounter,  bool isNewTurn,  int movesThisTurn,  String? lockedSequencePiece,  int heroeTakeCounter,  Map<String, int> clocks,  int? lastTurnTimestamp,  Map<String, dynamic> colorChosen,  List<String> colorsEverChosen,  bool mageUnlocked,  Map<String, int> passCount,  List<Map<String, dynamic>> moves,  Map<String, dynamic>? timeControl,  String? whiteName,  String? blackName,  String? whiteRole,  String? blackRole,  double? whiteRating,  double? blackRating,  String? boardName,  String side)  $default,) {final _that = this;
switch (_that) {
case _GameState():
return $default(_that.board,_that.pieces,_that.turn,_that.phase,_that.setupStep,_that.turnCounter,_that.isNewTurn,_that.movesThisTurn,_that.lockedSequencePiece,_that.heroeTakeCounter,_that.clocks,_that.lastTurnTimestamp,_that.colorChosen,_that.colorsEverChosen,_that.mageUnlocked,_that.passCount,_that.moves,_that.timeControl,_that.whiteName,_that.blackName,_that.whiteRole,_that.blackRole,_that.whiteRating,_that.blackRating,_that.boardName,_that.side);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Map<String, dynamic> board,  List<Piece> pieces,  String turn,  String phase,  int setupStep,  int turnCounter,  bool isNewTurn,  int movesThisTurn,  String? lockedSequencePiece,  int heroeTakeCounter,  Map<String, int> clocks,  int? lastTurnTimestamp,  Map<String, dynamic> colorChosen,  List<String> colorsEverChosen,  bool mageUnlocked,  Map<String, int> passCount,  List<Map<String, dynamic>> moves,  Map<String, dynamic>? timeControl,  String? whiteName,  String? blackName,  String? whiteRole,  String? blackRole,  double? whiteRating,  double? blackRating,  String? boardName,  String side)?  $default,) {final _that = this;
switch (_that) {
case _GameState() when $default != null:
return $default(_that.board,_that.pieces,_that.turn,_that.phase,_that.setupStep,_that.turnCounter,_that.isNewTurn,_that.movesThisTurn,_that.lockedSequencePiece,_that.heroeTakeCounter,_that.clocks,_that.lastTurnTimestamp,_that.colorChosen,_that.colorsEverChosen,_that.mageUnlocked,_that.passCount,_that.moves,_that.timeControl,_that.whiteName,_that.blackName,_that.whiteRole,_that.blackRole,_that.whiteRating,_that.blackRating,_that.boardName,_that.side);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _GameState implements GameState {
  const _GameState({required final  Map<String, dynamic> board, required final  List<Piece> pieces, required this.turn, this.phase = 'Setup', this.setupStep = 0, this.turnCounter = 0, this.isNewTurn = true, this.movesThisTurn = 0, this.lockedSequencePiece, this.heroeTakeCounter = 0, final  Map<String, int> clocks = const {}, this.lastTurnTimestamp, final  Map<String, dynamic> colorChosen = const {}, final  List<String> colorsEverChosen = const [], this.mageUnlocked = false, final  Map<String, int> passCount = const {'white' : 0, 'black' : 0}, final  List<Map<String, dynamic>> moves = const [], final  Map<String, dynamic>? timeControl, this.whiteName, this.blackName, this.whiteRole, this.blackRole, this.whiteRating, this.blackRating, this.boardName, this.side = 'spectator'}): _board = board,_pieces = pieces,_clocks = clocks,_colorChosen = colorChosen,_colorsEverChosen = colorsEverChosen,_passCount = passCount,_moves = moves,_timeControl = timeControl;
  factory _GameState.fromJson(Map<String, dynamic> json) => _$GameStateFromJson(json);

/// Raw board JSON — used by the Rust engine wrapper.
 final  Map<String, dynamic> _board;
/// Raw board JSON — used by the Rust engine wrapper.
@override Map<String, dynamic> get board {
  if (_board is EqualUnmodifiableMapView) return _board;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_board);
}

 final  List<Piece> _pieces;
@override List<Piece> get pieces {
  if (_pieces is EqualUnmodifiableListView) return _pieces;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_pieces);
}

@override final  String turn;
// 'white' | 'black'
@override@JsonKey() final  String phase;
// 'Setup' | 'ColorChoice' | 'Playing' | 'GameOver'
@override@JsonKey() final  int setupStep;
@override@JsonKey() final  int turnCounter;
@override@JsonKey() final  bool isNewTurn;
@override@JsonKey() final  int movesThisTurn;
@override final  String? lockedSequencePiece;
@override@JsonKey() final  int heroeTakeCounter;
 final  Map<String, int> _clocks;
@override@JsonKey() Map<String, int> get clocks {
  if (_clocks is EqualUnmodifiableMapView) return _clocks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_clocks);
}

@override final  int? lastTurnTimestamp;
 final  Map<String, dynamic> _colorChosen;
@override@JsonKey() Map<String, dynamic> get colorChosen {
  if (_colorChosen is EqualUnmodifiableMapView) return _colorChosen;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_colorChosen);
}

 final  List<String> _colorsEverChosen;
@override@JsonKey() List<String> get colorsEverChosen {
  if (_colorsEverChosen is EqualUnmodifiableListView) return _colorsEverChosen;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_colorsEverChosen);
}

@override@JsonKey() final  bool mageUnlocked;
 final  Map<String, int> _passCount;
@override@JsonKey() Map<String, int> get passCount {
  if (_passCount is EqualUnmodifiableMapView) return _passCount;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_passCount);
}

 final  List<Map<String, dynamic>> _moves;
@override@JsonKey() List<Map<String, dynamic>> get moves {
  if (_moves is EqualUnmodifiableListView) return _moves;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_moves);
}

// Time control
 final  Map<String, dynamic>? _timeControl;
// Time control
@override Map<String, dynamic>? get timeControl {
  final value = _timeControl;
  if (value == null) return null;
  if (_timeControl is EqualUnmodifiableMapView) return _timeControl;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

// Player info
@override final  String? whiteName;
@override final  String? blackName;
@override final  String? whiteRole;
@override final  String? blackRole;
@override final  double? whiteRating;
@override final  double? blackRating;
@override final  String? boardName;
// Role of this player
@override@JsonKey() final  String side;

/// Create a copy of GameState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GameStateCopyWith<_GameState> get copyWith => __$GameStateCopyWithImpl<_GameState>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GameStateToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _GameState&&const DeepCollectionEquality().equals(other._board, _board)&&const DeepCollectionEquality().equals(other._pieces, _pieces)&&(identical(other.turn, turn) || other.turn == turn)&&(identical(other.phase, phase) || other.phase == phase)&&(identical(other.setupStep, setupStep) || other.setupStep == setupStep)&&(identical(other.turnCounter, turnCounter) || other.turnCounter == turnCounter)&&(identical(other.isNewTurn, isNewTurn) || other.isNewTurn == isNewTurn)&&(identical(other.movesThisTurn, movesThisTurn) || other.movesThisTurn == movesThisTurn)&&(identical(other.lockedSequencePiece, lockedSequencePiece) || other.lockedSequencePiece == lockedSequencePiece)&&(identical(other.heroeTakeCounter, heroeTakeCounter) || other.heroeTakeCounter == heroeTakeCounter)&&const DeepCollectionEquality().equals(other._clocks, _clocks)&&(identical(other.lastTurnTimestamp, lastTurnTimestamp) || other.lastTurnTimestamp == lastTurnTimestamp)&&const DeepCollectionEquality().equals(other._colorChosen, _colorChosen)&&const DeepCollectionEquality().equals(other._colorsEverChosen, _colorsEverChosen)&&(identical(other.mageUnlocked, mageUnlocked) || other.mageUnlocked == mageUnlocked)&&const DeepCollectionEquality().equals(other._passCount, _passCount)&&const DeepCollectionEquality().equals(other._moves, _moves)&&const DeepCollectionEquality().equals(other._timeControl, _timeControl)&&(identical(other.whiteName, whiteName) || other.whiteName == whiteName)&&(identical(other.blackName, blackName) || other.blackName == blackName)&&(identical(other.whiteRole, whiteRole) || other.whiteRole == whiteRole)&&(identical(other.blackRole, blackRole) || other.blackRole == blackRole)&&(identical(other.whiteRating, whiteRating) || other.whiteRating == whiteRating)&&(identical(other.blackRating, blackRating) || other.blackRating == blackRating)&&(identical(other.boardName, boardName) || other.boardName == boardName)&&(identical(other.side, side) || other.side == side));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,const DeepCollectionEquality().hash(_board),const DeepCollectionEquality().hash(_pieces),turn,phase,setupStep,turnCounter,isNewTurn,movesThisTurn,lockedSequencePiece,heroeTakeCounter,const DeepCollectionEquality().hash(_clocks),lastTurnTimestamp,const DeepCollectionEquality().hash(_colorChosen),const DeepCollectionEquality().hash(_colorsEverChosen),mageUnlocked,const DeepCollectionEquality().hash(_passCount),const DeepCollectionEquality().hash(_moves),const DeepCollectionEquality().hash(_timeControl),whiteName,blackName,whiteRole,blackRole,whiteRating,blackRating,boardName,side]);

@override
String toString() {
  return 'GameState(board: $board, pieces: $pieces, turn: $turn, phase: $phase, setupStep: $setupStep, turnCounter: $turnCounter, isNewTurn: $isNewTurn, movesThisTurn: $movesThisTurn, lockedSequencePiece: $lockedSequencePiece, heroeTakeCounter: $heroeTakeCounter, clocks: $clocks, lastTurnTimestamp: $lastTurnTimestamp, colorChosen: $colorChosen, colorsEverChosen: $colorsEverChosen, mageUnlocked: $mageUnlocked, passCount: $passCount, moves: $moves, timeControl: $timeControl, whiteName: $whiteName, blackName: $blackName, whiteRole: $whiteRole, blackRole: $blackRole, whiteRating: $whiteRating, blackRating: $blackRating, boardName: $boardName, side: $side)';
}


}

/// @nodoc
abstract mixin class _$GameStateCopyWith<$Res> implements $GameStateCopyWith<$Res> {
  factory _$GameStateCopyWith(_GameState value, $Res Function(_GameState) _then) = __$GameStateCopyWithImpl;
@override @useResult
$Res call({
 Map<String, dynamic> board, List<Piece> pieces, String turn, String phase, int setupStep, int turnCounter, bool isNewTurn, int movesThisTurn, String? lockedSequencePiece, int heroeTakeCounter, Map<String, int> clocks, int? lastTurnTimestamp, Map<String, dynamic> colorChosen, List<String> colorsEverChosen, bool mageUnlocked, Map<String, int> passCount, List<Map<String, dynamic>> moves, Map<String, dynamic>? timeControl, String? whiteName, String? blackName, String? whiteRole, String? blackRole, double? whiteRating, double? blackRating, String? boardName, String side
});




}
/// @nodoc
class __$GameStateCopyWithImpl<$Res>
    implements _$GameStateCopyWith<$Res> {
  __$GameStateCopyWithImpl(this._self, this._then);

  final _GameState _self;
  final $Res Function(_GameState) _then;

/// Create a copy of GameState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? board = null,Object? pieces = null,Object? turn = null,Object? phase = null,Object? setupStep = null,Object? turnCounter = null,Object? isNewTurn = null,Object? movesThisTurn = null,Object? lockedSequencePiece = freezed,Object? heroeTakeCounter = null,Object? clocks = null,Object? lastTurnTimestamp = freezed,Object? colorChosen = null,Object? colorsEverChosen = null,Object? mageUnlocked = null,Object? passCount = null,Object? moves = null,Object? timeControl = freezed,Object? whiteName = freezed,Object? blackName = freezed,Object? whiteRole = freezed,Object? blackRole = freezed,Object? whiteRating = freezed,Object? blackRating = freezed,Object? boardName = freezed,Object? side = null,}) {
  return _then(_GameState(
board: null == board ? _self._board : board // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,pieces: null == pieces ? _self._pieces : pieces // ignore: cast_nullable_to_non_nullable
as List<Piece>,turn: null == turn ? _self.turn : turn // ignore: cast_nullable_to_non_nullable
as String,phase: null == phase ? _self.phase : phase // ignore: cast_nullable_to_non_nullable
as String,setupStep: null == setupStep ? _self.setupStep : setupStep // ignore: cast_nullable_to_non_nullable
as int,turnCounter: null == turnCounter ? _self.turnCounter : turnCounter // ignore: cast_nullable_to_non_nullable
as int,isNewTurn: null == isNewTurn ? _self.isNewTurn : isNewTurn // ignore: cast_nullable_to_non_nullable
as bool,movesThisTurn: null == movesThisTurn ? _self.movesThisTurn : movesThisTurn // ignore: cast_nullable_to_non_nullable
as int,lockedSequencePiece: freezed == lockedSequencePiece ? _self.lockedSequencePiece : lockedSequencePiece // ignore: cast_nullable_to_non_nullable
as String?,heroeTakeCounter: null == heroeTakeCounter ? _self.heroeTakeCounter : heroeTakeCounter // ignore: cast_nullable_to_non_nullable
as int,clocks: null == clocks ? _self._clocks : clocks // ignore: cast_nullable_to_non_nullable
as Map<String, int>,lastTurnTimestamp: freezed == lastTurnTimestamp ? _self.lastTurnTimestamp : lastTurnTimestamp // ignore: cast_nullable_to_non_nullable
as int?,colorChosen: null == colorChosen ? _self._colorChosen : colorChosen // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,colorsEverChosen: null == colorsEverChosen ? _self._colorsEverChosen : colorsEverChosen // ignore: cast_nullable_to_non_nullable
as List<String>,mageUnlocked: null == mageUnlocked ? _self.mageUnlocked : mageUnlocked // ignore: cast_nullable_to_non_nullable
as bool,passCount: null == passCount ? _self._passCount : passCount // ignore: cast_nullable_to_non_nullable
as Map<String, int>,moves: null == moves ? _self._moves : moves // ignore: cast_nullable_to_non_nullable
as List<Map<String, dynamic>>,timeControl: freezed == timeControl ? _self._timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,whiteName: freezed == whiteName ? _self.whiteName : whiteName // ignore: cast_nullable_to_non_nullable
as String?,blackName: freezed == blackName ? _self.blackName : blackName // ignore: cast_nullable_to_non_nullable
as String?,whiteRole: freezed == whiteRole ? _self.whiteRole : whiteRole // ignore: cast_nullable_to_non_nullable
as String?,blackRole: freezed == blackRole ? _self.blackRole : blackRole // ignore: cast_nullable_to_non_nullable
as String?,whiteRating: freezed == whiteRating ? _self.whiteRating : whiteRating // ignore: cast_nullable_to_non_nullable
as double?,blackRating: freezed == blackRating ? _self.blackRating : blackRating // ignore: cast_nullable_to_non_nullable
as double?,boardName: freezed == boardName ? _self.boardName : boardName // ignore: cast_nullable_to_non_nullable
as String?,side: null == side ? _self.side : side // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$GameRequest {

 String get requestId; String? get userId;// optional — not always sent
 String get username; String get role; Map<String, dynamic> get timeControl; String? get boardId; int get createdAt;
/// Create a copy of GameRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GameRequestCopyWith<GameRequest> get copyWith => _$GameRequestCopyWithImpl<GameRequest>(this as GameRequest, _$identity);

  /// Serializes this GameRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GameRequest&&(identical(other.requestId, requestId) || other.requestId == requestId)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.username, username) || other.username == username)&&(identical(other.role, role) || other.role == role)&&const DeepCollectionEquality().equals(other.timeControl, timeControl)&&(identical(other.boardId, boardId) || other.boardId == boardId)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,requestId,userId,username,role,const DeepCollectionEquality().hash(timeControl),boardId,createdAt);

@override
String toString() {
  return 'GameRequest(requestId: $requestId, userId: $userId, username: $username, role: $role, timeControl: $timeControl, boardId: $boardId, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $GameRequestCopyWith<$Res>  {
  factory $GameRequestCopyWith(GameRequest value, $Res Function(GameRequest) _then) = _$GameRequestCopyWithImpl;
@useResult
$Res call({
 String requestId, String? userId, String username, String role, Map<String, dynamic> timeControl, String? boardId, int createdAt
});




}
/// @nodoc
class _$GameRequestCopyWithImpl<$Res>
    implements $GameRequestCopyWith<$Res> {
  _$GameRequestCopyWithImpl(this._self, this._then);

  final GameRequest _self;
  final $Res Function(GameRequest) _then;

/// Create a copy of GameRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? requestId = null,Object? userId = freezed,Object? username = null,Object? role = null,Object? timeControl = null,Object? boardId = freezed,Object? createdAt = null,}) {
  return _then(_self.copyWith(
requestId: null == requestId ? _self.requestId : requestId // ignore: cast_nullable_to_non_nullable
as String,userId: freezed == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String?,username: null == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String,timeControl: null == timeControl ? _self.timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,boardId: freezed == boardId ? _self.boardId : boardId // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [GameRequest].
extension GameRequestPatterns on GameRequest {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _GameRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _GameRequest() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _GameRequest value)  $default,){
final _that = this;
switch (_that) {
case _GameRequest():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _GameRequest value)?  $default,){
final _that = this;
switch (_that) {
case _GameRequest() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String requestId,  String? userId,  String username,  String role,  Map<String, dynamic> timeControl,  String? boardId,  int createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _GameRequest() when $default != null:
return $default(_that.requestId,_that.userId,_that.username,_that.role,_that.timeControl,_that.boardId,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String requestId,  String? userId,  String username,  String role,  Map<String, dynamic> timeControl,  String? boardId,  int createdAt)  $default,) {final _that = this;
switch (_that) {
case _GameRequest():
return $default(_that.requestId,_that.userId,_that.username,_that.role,_that.timeControl,_that.boardId,_that.createdAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String requestId,  String? userId,  String username,  String role,  Map<String, dynamic> timeControl,  String? boardId,  int createdAt)?  $default,) {final _that = this;
switch (_that) {
case _GameRequest() when $default != null:
return $default(_that.requestId,_that.userId,_that.username,_that.role,_that.timeControl,_that.boardId,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _GameRequest implements GameRequest {
  const _GameRequest({required this.requestId, this.userId, required this.username, required this.role, required final  Map<String, dynamic> timeControl, this.boardId, required this.createdAt}): _timeControl = timeControl;
  factory _GameRequest.fromJson(Map<String, dynamic> json) => _$GameRequestFromJson(json);

@override final  String requestId;
@override final  String? userId;
// optional — not always sent
@override final  String username;
@override final  String role;
 final  Map<String, dynamic> _timeControl;
@override Map<String, dynamic> get timeControl {
  if (_timeControl is EqualUnmodifiableMapView) return _timeControl;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_timeControl);
}

@override final  String? boardId;
@override final  int createdAt;

/// Create a copy of GameRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GameRequestCopyWith<_GameRequest> get copyWith => __$GameRequestCopyWithImpl<_GameRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GameRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _GameRequest&&(identical(other.requestId, requestId) || other.requestId == requestId)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.username, username) || other.username == username)&&(identical(other.role, role) || other.role == role)&&const DeepCollectionEquality().equals(other._timeControl, _timeControl)&&(identical(other.boardId, boardId) || other.boardId == boardId)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,requestId,userId,username,role,const DeepCollectionEquality().hash(_timeControl),boardId,createdAt);

@override
String toString() {
  return 'GameRequest(requestId: $requestId, userId: $userId, username: $username, role: $role, timeControl: $timeControl, boardId: $boardId, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$GameRequestCopyWith<$Res> implements $GameRequestCopyWith<$Res> {
  factory _$GameRequestCopyWith(_GameRequest value, $Res Function(_GameRequest) _then) = __$GameRequestCopyWithImpl;
@override @useResult
$Res call({
 String requestId, String? userId, String username, String role, Map<String, dynamic> timeControl, String? boardId, int createdAt
});




}
/// @nodoc
class __$GameRequestCopyWithImpl<$Res>
    implements _$GameRequestCopyWith<$Res> {
  __$GameRequestCopyWithImpl(this._self, this._then);

  final _GameRequest _self;
  final $Res Function(_GameRequest) _then;

/// Create a copy of GameRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? requestId = null,Object? userId = freezed,Object? username = null,Object? role = null,Object? timeControl = null,Object? boardId = freezed,Object? createdAt = null,}) {
  return _then(_GameRequest(
requestId: null == requestId ? _self.requestId : requestId // ignore: cast_nullable_to_non_nullable
as String,userId: freezed == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String?,username: null == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String,timeControl: null == timeControl ? _self._timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,boardId: freezed == boardId ? _self.boardId : boardId // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ActiveGame {

 String get hash; String get whiteName; String get blackName; String? get whiteRole; String? get blackRole; Map<String, dynamic> get timeControl; int get moveCount; bool get hasDisconnect; String? get white;// userId
 String? get black;// userId
 String? get tournamentId;
/// Create a copy of ActiveGame
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActiveGameCopyWith<ActiveGame> get copyWith => _$ActiveGameCopyWithImpl<ActiveGame>(this as ActiveGame, _$identity);

  /// Serializes this ActiveGame to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActiveGame&&(identical(other.hash, hash) || other.hash == hash)&&(identical(other.whiteName, whiteName) || other.whiteName == whiteName)&&(identical(other.blackName, blackName) || other.blackName == blackName)&&(identical(other.whiteRole, whiteRole) || other.whiteRole == whiteRole)&&(identical(other.blackRole, blackRole) || other.blackRole == blackRole)&&const DeepCollectionEquality().equals(other.timeControl, timeControl)&&(identical(other.moveCount, moveCount) || other.moveCount == moveCount)&&(identical(other.hasDisconnect, hasDisconnect) || other.hasDisconnect == hasDisconnect)&&(identical(other.white, white) || other.white == white)&&(identical(other.black, black) || other.black == black)&&(identical(other.tournamentId, tournamentId) || other.tournamentId == tournamentId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,hash,whiteName,blackName,whiteRole,blackRole,const DeepCollectionEquality().hash(timeControl),moveCount,hasDisconnect,white,black,tournamentId);

@override
String toString() {
  return 'ActiveGame(hash: $hash, whiteName: $whiteName, blackName: $blackName, whiteRole: $whiteRole, blackRole: $blackRole, timeControl: $timeControl, moveCount: $moveCount, hasDisconnect: $hasDisconnect, white: $white, black: $black, tournamentId: $tournamentId)';
}


}

/// @nodoc
abstract mixin class $ActiveGameCopyWith<$Res>  {
  factory $ActiveGameCopyWith(ActiveGame value, $Res Function(ActiveGame) _then) = _$ActiveGameCopyWithImpl;
@useResult
$Res call({
 String hash, String whiteName, String blackName, String? whiteRole, String? blackRole, Map<String, dynamic> timeControl, int moveCount, bool hasDisconnect, String? white, String? black, String? tournamentId
});




}
/// @nodoc
class _$ActiveGameCopyWithImpl<$Res>
    implements $ActiveGameCopyWith<$Res> {
  _$ActiveGameCopyWithImpl(this._self, this._then);

  final ActiveGame _self;
  final $Res Function(ActiveGame) _then;

/// Create a copy of ActiveGame
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? hash = null,Object? whiteName = null,Object? blackName = null,Object? whiteRole = freezed,Object? blackRole = freezed,Object? timeControl = null,Object? moveCount = null,Object? hasDisconnect = null,Object? white = freezed,Object? black = freezed,Object? tournamentId = freezed,}) {
  return _then(_self.copyWith(
hash: null == hash ? _self.hash : hash // ignore: cast_nullable_to_non_nullable
as String,whiteName: null == whiteName ? _self.whiteName : whiteName // ignore: cast_nullable_to_non_nullable
as String,blackName: null == blackName ? _self.blackName : blackName // ignore: cast_nullable_to_non_nullable
as String,whiteRole: freezed == whiteRole ? _self.whiteRole : whiteRole // ignore: cast_nullable_to_non_nullable
as String?,blackRole: freezed == blackRole ? _self.blackRole : blackRole // ignore: cast_nullable_to_non_nullable
as String?,timeControl: null == timeControl ? _self.timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,moveCount: null == moveCount ? _self.moveCount : moveCount // ignore: cast_nullable_to_non_nullable
as int,hasDisconnect: null == hasDisconnect ? _self.hasDisconnect : hasDisconnect // ignore: cast_nullable_to_non_nullable
as bool,white: freezed == white ? _self.white : white // ignore: cast_nullable_to_non_nullable
as String?,black: freezed == black ? _self.black : black // ignore: cast_nullable_to_non_nullable
as String?,tournamentId: freezed == tournamentId ? _self.tournamentId : tournamentId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ActiveGame].
extension ActiveGamePatterns on ActiveGame {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActiveGame value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActiveGame() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActiveGame value)  $default,){
final _that = this;
switch (_that) {
case _ActiveGame():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActiveGame value)?  $default,){
final _that = this;
switch (_that) {
case _ActiveGame() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String hash,  String whiteName,  String blackName,  String? whiteRole,  String? blackRole,  Map<String, dynamic> timeControl,  int moveCount,  bool hasDisconnect,  String? white,  String? black,  String? tournamentId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActiveGame() when $default != null:
return $default(_that.hash,_that.whiteName,_that.blackName,_that.whiteRole,_that.blackRole,_that.timeControl,_that.moveCount,_that.hasDisconnect,_that.white,_that.black,_that.tournamentId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String hash,  String whiteName,  String blackName,  String? whiteRole,  String? blackRole,  Map<String, dynamic> timeControl,  int moveCount,  bool hasDisconnect,  String? white,  String? black,  String? tournamentId)  $default,) {final _that = this;
switch (_that) {
case _ActiveGame():
return $default(_that.hash,_that.whiteName,_that.blackName,_that.whiteRole,_that.blackRole,_that.timeControl,_that.moveCount,_that.hasDisconnect,_that.white,_that.black,_that.tournamentId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String hash,  String whiteName,  String blackName,  String? whiteRole,  String? blackRole,  Map<String, dynamic> timeControl,  int moveCount,  bool hasDisconnect,  String? white,  String? black,  String? tournamentId)?  $default,) {final _that = this;
switch (_that) {
case _ActiveGame() when $default != null:
return $default(_that.hash,_that.whiteName,_that.blackName,_that.whiteRole,_that.blackRole,_that.timeControl,_that.moveCount,_that.hasDisconnect,_that.white,_that.black,_that.tournamentId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ActiveGame implements ActiveGame {
  const _ActiveGame({required this.hash, required this.whiteName, required this.blackName, this.whiteRole, this.blackRole, required final  Map<String, dynamic> timeControl, this.moveCount = 0, this.hasDisconnect = false, this.white, this.black, this.tournamentId}): _timeControl = timeControl;
  factory _ActiveGame.fromJson(Map<String, dynamic> json) => _$ActiveGameFromJson(json);

@override final  String hash;
@override final  String whiteName;
@override final  String blackName;
@override final  String? whiteRole;
@override final  String? blackRole;
 final  Map<String, dynamic> _timeControl;
@override Map<String, dynamic> get timeControl {
  if (_timeControl is EqualUnmodifiableMapView) return _timeControl;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_timeControl);
}

@override@JsonKey() final  int moveCount;
@override@JsonKey() final  bool hasDisconnect;
@override final  String? white;
// userId
@override final  String? black;
// userId
@override final  String? tournamentId;

/// Create a copy of ActiveGame
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActiveGameCopyWith<_ActiveGame> get copyWith => __$ActiveGameCopyWithImpl<_ActiveGame>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ActiveGameToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActiveGame&&(identical(other.hash, hash) || other.hash == hash)&&(identical(other.whiteName, whiteName) || other.whiteName == whiteName)&&(identical(other.blackName, blackName) || other.blackName == blackName)&&(identical(other.whiteRole, whiteRole) || other.whiteRole == whiteRole)&&(identical(other.blackRole, blackRole) || other.blackRole == blackRole)&&const DeepCollectionEquality().equals(other._timeControl, _timeControl)&&(identical(other.moveCount, moveCount) || other.moveCount == moveCount)&&(identical(other.hasDisconnect, hasDisconnect) || other.hasDisconnect == hasDisconnect)&&(identical(other.white, white) || other.white == white)&&(identical(other.black, black) || other.black == black)&&(identical(other.tournamentId, tournamentId) || other.tournamentId == tournamentId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,hash,whiteName,blackName,whiteRole,blackRole,const DeepCollectionEquality().hash(_timeControl),moveCount,hasDisconnect,white,black,tournamentId);

@override
String toString() {
  return 'ActiveGame(hash: $hash, whiteName: $whiteName, blackName: $blackName, whiteRole: $whiteRole, blackRole: $blackRole, timeControl: $timeControl, moveCount: $moveCount, hasDisconnect: $hasDisconnect, white: $white, black: $black, tournamentId: $tournamentId)';
}


}

/// @nodoc
abstract mixin class _$ActiveGameCopyWith<$Res> implements $ActiveGameCopyWith<$Res> {
  factory _$ActiveGameCopyWith(_ActiveGame value, $Res Function(_ActiveGame) _then) = __$ActiveGameCopyWithImpl;
@override @useResult
$Res call({
 String hash, String whiteName, String blackName, String? whiteRole, String? blackRole, Map<String, dynamic> timeControl, int moveCount, bool hasDisconnect, String? white, String? black, String? tournamentId
});




}
/// @nodoc
class __$ActiveGameCopyWithImpl<$Res>
    implements _$ActiveGameCopyWith<$Res> {
  __$ActiveGameCopyWithImpl(this._self, this._then);

  final _ActiveGame _self;
  final $Res Function(_ActiveGame) _then;

/// Create a copy of ActiveGame
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? hash = null,Object? whiteName = null,Object? blackName = null,Object? whiteRole = freezed,Object? blackRole = freezed,Object? timeControl = null,Object? moveCount = null,Object? hasDisconnect = null,Object? white = freezed,Object? black = freezed,Object? tournamentId = freezed,}) {
  return _then(_ActiveGame(
hash: null == hash ? _self.hash : hash // ignore: cast_nullable_to_non_nullable
as String,whiteName: null == whiteName ? _self.whiteName : whiteName // ignore: cast_nullable_to_non_nullable
as String,blackName: null == blackName ? _self.blackName : blackName // ignore: cast_nullable_to_non_nullable
as String,whiteRole: freezed == whiteRole ? _self.whiteRole : whiteRole // ignore: cast_nullable_to_non_nullable
as String?,blackRole: freezed == blackRole ? _self.blackRole : blackRole // ignore: cast_nullable_to_non_nullable
as String?,timeControl: null == timeControl ? _self._timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,moveCount: null == moveCount ? _self.moveCount : moveCount // ignore: cast_nullable_to_non_nullable
as int,hasDisconnect: null == hasDisconnect ? _self.hasDisconnect : hasDisconnect // ignore: cast_nullable_to_non_nullable
as bool,white: freezed == white ? _self.white : white // ignore: cast_nullable_to_non_nullable
as String?,black: freezed == black ? _self.black : black // ignore: cast_nullable_to_non_nullable
as String?,tournamentId: freezed == tournamentId ? _self.tournamentId : tournamentId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$BotInfo {

@JsonKey(name: 'agent_type') String get agentType;@JsonKey(name: 'model_name') String get modelName;@JsonKey(name: 'display_name') String get displayName; double? get rating; bool get busy;
/// Create a copy of BotInfo
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BotInfoCopyWith<BotInfo> get copyWith => _$BotInfoCopyWithImpl<BotInfo>(this as BotInfo, _$identity);

  /// Serializes this BotInfo to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BotInfo&&(identical(other.agentType, agentType) || other.agentType == agentType)&&(identical(other.modelName, modelName) || other.modelName == modelName)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.busy, busy) || other.busy == busy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,agentType,modelName,displayName,rating,busy);

@override
String toString() {
  return 'BotInfo(agentType: $agentType, modelName: $modelName, displayName: $displayName, rating: $rating, busy: $busy)';
}


}

/// @nodoc
abstract mixin class $BotInfoCopyWith<$Res>  {
  factory $BotInfoCopyWith(BotInfo value, $Res Function(BotInfo) _then) = _$BotInfoCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'agent_type') String agentType,@JsonKey(name: 'model_name') String modelName,@JsonKey(name: 'display_name') String displayName, double? rating, bool busy
});




}
/// @nodoc
class _$BotInfoCopyWithImpl<$Res>
    implements $BotInfoCopyWith<$Res> {
  _$BotInfoCopyWithImpl(this._self, this._then);

  final BotInfo _self;
  final $Res Function(BotInfo) _then;

/// Create a copy of BotInfo
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? agentType = null,Object? modelName = null,Object? displayName = null,Object? rating = freezed,Object? busy = null,}) {
  return _then(_self.copyWith(
agentType: null == agentType ? _self.agentType : agentType // ignore: cast_nullable_to_non_nullable
as String,modelName: null == modelName ? _self.modelName : modelName // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,rating: freezed == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double?,busy: null == busy ? _self.busy : busy // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [BotInfo].
extension BotInfoPatterns on BotInfo {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BotInfo value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BotInfo() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BotInfo value)  $default,){
final _that = this;
switch (_that) {
case _BotInfo():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BotInfo value)?  $default,){
final _that = this;
switch (_that) {
case _BotInfo() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'agent_type')  String agentType, @JsonKey(name: 'model_name')  String modelName, @JsonKey(name: 'display_name')  String displayName,  double? rating,  bool busy)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BotInfo() when $default != null:
return $default(_that.agentType,_that.modelName,_that.displayName,_that.rating,_that.busy);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'agent_type')  String agentType, @JsonKey(name: 'model_name')  String modelName, @JsonKey(name: 'display_name')  String displayName,  double? rating,  bool busy)  $default,) {final _that = this;
switch (_that) {
case _BotInfo():
return $default(_that.agentType,_that.modelName,_that.displayName,_that.rating,_that.busy);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'agent_type')  String agentType, @JsonKey(name: 'model_name')  String modelName, @JsonKey(name: 'display_name')  String displayName,  double? rating,  bool busy)?  $default,) {final _that = this;
switch (_that) {
case _BotInfo() when $default != null:
return $default(_that.agentType,_that.modelName,_that.displayName,_that.rating,_that.busy);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BotInfo implements BotInfo {
  const _BotInfo({@JsonKey(name: 'agent_type') required this.agentType, @JsonKey(name: 'model_name') required this.modelName, @JsonKey(name: 'display_name') required this.displayName, this.rating, this.busy = false});
  factory _BotInfo.fromJson(Map<String, dynamic> json) => _$BotInfoFromJson(json);

@override@JsonKey(name: 'agent_type') final  String agentType;
@override@JsonKey(name: 'model_name') final  String modelName;
@override@JsonKey(name: 'display_name') final  String displayName;
@override final  double? rating;
@override@JsonKey() final  bool busy;

/// Create a copy of BotInfo
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BotInfoCopyWith<_BotInfo> get copyWith => __$BotInfoCopyWithImpl<_BotInfo>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BotInfoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BotInfo&&(identical(other.agentType, agentType) || other.agentType == agentType)&&(identical(other.modelName, modelName) || other.modelName == modelName)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.busy, busy) || other.busy == busy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,agentType,modelName,displayName,rating,busy);

@override
String toString() {
  return 'BotInfo(agentType: $agentType, modelName: $modelName, displayName: $displayName, rating: $rating, busy: $busy)';
}


}

/// @nodoc
abstract mixin class _$BotInfoCopyWith<$Res> implements $BotInfoCopyWith<$Res> {
  factory _$BotInfoCopyWith(_BotInfo value, $Res Function(_BotInfo) _then) = __$BotInfoCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'agent_type') String agentType,@JsonKey(name: 'model_name') String modelName,@JsonKey(name: 'display_name') String displayName, double? rating, bool busy
});




}
/// @nodoc
class __$BotInfoCopyWithImpl<$Res>
    implements _$BotInfoCopyWith<$Res> {
  __$BotInfoCopyWithImpl(this._self, this._then);

  final _BotInfo _self;
  final $Res Function(_BotInfo) _then;

/// Create a copy of BotInfo
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? agentType = null,Object? modelName = null,Object? displayName = null,Object? rating = freezed,Object? busy = null,}) {
  return _then(_BotInfo(
agentType: null == agentType ? _self.agentType : agentType // ignore: cast_nullable_to_non_nullable
as String,modelName: null == modelName ? _self.modelName : modelName // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,rating: freezed == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double?,busy: null == busy ? _self.busy : busy // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$LiveStats {

 int get onlineUsers; int get activeGames;
/// Create a copy of LiveStats
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LiveStatsCopyWith<LiveStats> get copyWith => _$LiveStatsCopyWithImpl<LiveStats>(this as LiveStats, _$identity);

  /// Serializes this LiveStats to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LiveStats&&(identical(other.onlineUsers, onlineUsers) || other.onlineUsers == onlineUsers)&&(identical(other.activeGames, activeGames) || other.activeGames == activeGames));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,onlineUsers,activeGames);

@override
String toString() {
  return 'LiveStats(onlineUsers: $onlineUsers, activeGames: $activeGames)';
}


}

/// @nodoc
abstract mixin class $LiveStatsCopyWith<$Res>  {
  factory $LiveStatsCopyWith(LiveStats value, $Res Function(LiveStats) _then) = _$LiveStatsCopyWithImpl;
@useResult
$Res call({
 int onlineUsers, int activeGames
});




}
/// @nodoc
class _$LiveStatsCopyWithImpl<$Res>
    implements $LiveStatsCopyWith<$Res> {
  _$LiveStatsCopyWithImpl(this._self, this._then);

  final LiveStats _self;
  final $Res Function(LiveStats) _then;

/// Create a copy of LiveStats
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? onlineUsers = null,Object? activeGames = null,}) {
  return _then(_self.copyWith(
onlineUsers: null == onlineUsers ? _self.onlineUsers : onlineUsers // ignore: cast_nullable_to_non_nullable
as int,activeGames: null == activeGames ? _self.activeGames : activeGames // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [LiveStats].
extension LiveStatsPatterns on LiveStats {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LiveStats value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LiveStats() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LiveStats value)  $default,){
final _that = this;
switch (_that) {
case _LiveStats():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LiveStats value)?  $default,){
final _that = this;
switch (_that) {
case _LiveStats() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int onlineUsers,  int activeGames)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LiveStats() when $default != null:
return $default(_that.onlineUsers,_that.activeGames);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int onlineUsers,  int activeGames)  $default,) {final _that = this;
switch (_that) {
case _LiveStats():
return $default(_that.onlineUsers,_that.activeGames);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int onlineUsers,  int activeGames)?  $default,) {final _that = this;
switch (_that) {
case _LiveStats() when $default != null:
return $default(_that.onlineUsers,_that.activeGames);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LiveStats implements LiveStats {
  const _LiveStats({this.onlineUsers = 0, this.activeGames = 0});
  factory _LiveStats.fromJson(Map<String, dynamic> json) => _$LiveStatsFromJson(json);

@override@JsonKey() final  int onlineUsers;
@override@JsonKey() final  int activeGames;

/// Create a copy of LiveStats
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LiveStatsCopyWith<_LiveStats> get copyWith => __$LiveStatsCopyWithImpl<_LiveStats>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LiveStatsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LiveStats&&(identical(other.onlineUsers, onlineUsers) || other.onlineUsers == onlineUsers)&&(identical(other.activeGames, activeGames) || other.activeGames == activeGames));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,onlineUsers,activeGames);

@override
String toString() {
  return 'LiveStats(onlineUsers: $onlineUsers, activeGames: $activeGames)';
}


}

/// @nodoc
abstract mixin class _$LiveStatsCopyWith<$Res> implements $LiveStatsCopyWith<$Res> {
  factory _$LiveStatsCopyWith(_LiveStats value, $Res Function(_LiveStats) _then) = __$LiveStatsCopyWithImpl;
@override @useResult
$Res call({
 int onlineUsers, int activeGames
});




}
/// @nodoc
class __$LiveStatsCopyWithImpl<$Res>
    implements _$LiveStatsCopyWith<$Res> {
  __$LiveStatsCopyWithImpl(this._self, this._then);

  final _LiveStats _self;
  final $Res Function(_LiveStats) _then;

/// Create a copy of LiveStats
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? onlineUsers = null,Object? activeGames = null,}) {
  return _then(_LiveStats(
onlineUsers: null == onlineUsers ? _self.onlineUsers : onlineUsers // ignore: cast_nullable_to_non_nullable
as int,activeGames: null == activeGames ? _self.activeGames : activeGames // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$TournamentSummary {

 String get id; String get format;// swiss | knockout | round_robin | arena
 String get status;// open | active | completed
 Map<String, dynamic> get timeControl; String? get name; String? get creatorUsername; int? get currentCount; int? get maxParticipants; bool get hasPassword; int? get currentRound; int? get maxRounds;
/// Create a copy of TournamentSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TournamentSummaryCopyWith<TournamentSummary> get copyWith => _$TournamentSummaryCopyWithImpl<TournamentSummary>(this as TournamentSummary, _$identity);

  /// Serializes this TournamentSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TournamentSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.format, format) || other.format == format)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.timeControl, timeControl)&&(identical(other.name, name) || other.name == name)&&(identical(other.creatorUsername, creatorUsername) || other.creatorUsername == creatorUsername)&&(identical(other.currentCount, currentCount) || other.currentCount == currentCount)&&(identical(other.maxParticipants, maxParticipants) || other.maxParticipants == maxParticipants)&&(identical(other.hasPassword, hasPassword) || other.hasPassword == hasPassword)&&(identical(other.currentRound, currentRound) || other.currentRound == currentRound)&&(identical(other.maxRounds, maxRounds) || other.maxRounds == maxRounds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,format,status,const DeepCollectionEquality().hash(timeControl),name,creatorUsername,currentCount,maxParticipants,hasPassword,currentRound,maxRounds);

@override
String toString() {
  return 'TournamentSummary(id: $id, format: $format, status: $status, timeControl: $timeControl, name: $name, creatorUsername: $creatorUsername, currentCount: $currentCount, maxParticipants: $maxParticipants, hasPassword: $hasPassword, currentRound: $currentRound, maxRounds: $maxRounds)';
}


}

/// @nodoc
abstract mixin class $TournamentSummaryCopyWith<$Res>  {
  factory $TournamentSummaryCopyWith(TournamentSummary value, $Res Function(TournamentSummary) _then) = _$TournamentSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String format, String status, Map<String, dynamic> timeControl, String? name, String? creatorUsername, int? currentCount, int? maxParticipants, bool hasPassword, int? currentRound, int? maxRounds
});




}
/// @nodoc
class _$TournamentSummaryCopyWithImpl<$Res>
    implements $TournamentSummaryCopyWith<$Res> {
  _$TournamentSummaryCopyWithImpl(this._self, this._then);

  final TournamentSummary _self;
  final $Res Function(TournamentSummary) _then;

/// Create a copy of TournamentSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? format = null,Object? status = null,Object? timeControl = null,Object? name = freezed,Object? creatorUsername = freezed,Object? currentCount = freezed,Object? maxParticipants = freezed,Object? hasPassword = null,Object? currentRound = freezed,Object? maxRounds = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,format: null == format ? _self.format : format // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,timeControl: null == timeControl ? _self.timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,creatorUsername: freezed == creatorUsername ? _self.creatorUsername : creatorUsername // ignore: cast_nullable_to_non_nullable
as String?,currentCount: freezed == currentCount ? _self.currentCount : currentCount // ignore: cast_nullable_to_non_nullable
as int?,maxParticipants: freezed == maxParticipants ? _self.maxParticipants : maxParticipants // ignore: cast_nullable_to_non_nullable
as int?,hasPassword: null == hasPassword ? _self.hasPassword : hasPassword // ignore: cast_nullable_to_non_nullable
as bool,currentRound: freezed == currentRound ? _self.currentRound : currentRound // ignore: cast_nullable_to_non_nullable
as int?,maxRounds: freezed == maxRounds ? _self.maxRounds : maxRounds // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [TournamentSummary].
extension TournamentSummaryPatterns on TournamentSummary {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TournamentSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TournamentSummary() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TournamentSummary value)  $default,){
final _that = this;
switch (_that) {
case _TournamentSummary():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TournamentSummary value)?  $default,){
final _that = this;
switch (_that) {
case _TournamentSummary() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String format,  String status,  Map<String, dynamic> timeControl,  String? name,  String? creatorUsername,  int? currentCount,  int? maxParticipants,  bool hasPassword,  int? currentRound,  int? maxRounds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TournamentSummary() when $default != null:
return $default(_that.id,_that.format,_that.status,_that.timeControl,_that.name,_that.creatorUsername,_that.currentCount,_that.maxParticipants,_that.hasPassword,_that.currentRound,_that.maxRounds);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String format,  String status,  Map<String, dynamic> timeControl,  String? name,  String? creatorUsername,  int? currentCount,  int? maxParticipants,  bool hasPassword,  int? currentRound,  int? maxRounds)  $default,) {final _that = this;
switch (_that) {
case _TournamentSummary():
return $default(_that.id,_that.format,_that.status,_that.timeControl,_that.name,_that.creatorUsername,_that.currentCount,_that.maxParticipants,_that.hasPassword,_that.currentRound,_that.maxRounds);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String format,  String status,  Map<String, dynamic> timeControl,  String? name,  String? creatorUsername,  int? currentCount,  int? maxParticipants,  bool hasPassword,  int? currentRound,  int? maxRounds)?  $default,) {final _that = this;
switch (_that) {
case _TournamentSummary() when $default != null:
return $default(_that.id,_that.format,_that.status,_that.timeControl,_that.name,_that.creatorUsername,_that.currentCount,_that.maxParticipants,_that.hasPassword,_that.currentRound,_that.maxRounds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TournamentSummary implements TournamentSummary {
  const _TournamentSummary({required this.id, required this.format, required this.status, required final  Map<String, dynamic> timeControl, this.name, this.creatorUsername, this.currentCount, this.maxParticipants, this.hasPassword = false, this.currentRound, this.maxRounds}): _timeControl = timeControl;
  factory _TournamentSummary.fromJson(Map<String, dynamic> json) => _$TournamentSummaryFromJson(json);

@override final  String id;
@override final  String format;
// swiss | knockout | round_robin | arena
@override final  String status;
// open | active | completed
 final  Map<String, dynamic> _timeControl;
// open | active | completed
@override Map<String, dynamic> get timeControl {
  if (_timeControl is EqualUnmodifiableMapView) return _timeControl;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_timeControl);
}

@override final  String? name;
@override final  String? creatorUsername;
@override final  int? currentCount;
@override final  int? maxParticipants;
@override@JsonKey() final  bool hasPassword;
@override final  int? currentRound;
@override final  int? maxRounds;

/// Create a copy of TournamentSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TournamentSummaryCopyWith<_TournamentSummary> get copyWith => __$TournamentSummaryCopyWithImpl<_TournamentSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TournamentSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TournamentSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.format, format) || other.format == format)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._timeControl, _timeControl)&&(identical(other.name, name) || other.name == name)&&(identical(other.creatorUsername, creatorUsername) || other.creatorUsername == creatorUsername)&&(identical(other.currentCount, currentCount) || other.currentCount == currentCount)&&(identical(other.maxParticipants, maxParticipants) || other.maxParticipants == maxParticipants)&&(identical(other.hasPassword, hasPassword) || other.hasPassword == hasPassword)&&(identical(other.currentRound, currentRound) || other.currentRound == currentRound)&&(identical(other.maxRounds, maxRounds) || other.maxRounds == maxRounds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,format,status,const DeepCollectionEquality().hash(_timeControl),name,creatorUsername,currentCount,maxParticipants,hasPassword,currentRound,maxRounds);

@override
String toString() {
  return 'TournamentSummary(id: $id, format: $format, status: $status, timeControl: $timeControl, name: $name, creatorUsername: $creatorUsername, currentCount: $currentCount, maxParticipants: $maxParticipants, hasPassword: $hasPassword, currentRound: $currentRound, maxRounds: $maxRounds)';
}


}

/// @nodoc
abstract mixin class _$TournamentSummaryCopyWith<$Res> implements $TournamentSummaryCopyWith<$Res> {
  factory _$TournamentSummaryCopyWith(_TournamentSummary value, $Res Function(_TournamentSummary) _then) = __$TournamentSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String format, String status, Map<String, dynamic> timeControl, String? name, String? creatorUsername, int? currentCount, int? maxParticipants, bool hasPassword, int? currentRound, int? maxRounds
});




}
/// @nodoc
class __$TournamentSummaryCopyWithImpl<$Res>
    implements _$TournamentSummaryCopyWith<$Res> {
  __$TournamentSummaryCopyWithImpl(this._self, this._then);

  final _TournamentSummary _self;
  final $Res Function(_TournamentSummary) _then;

/// Create a copy of TournamentSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? format = null,Object? status = null,Object? timeControl = null,Object? name = freezed,Object? creatorUsername = freezed,Object? currentCount = freezed,Object? maxParticipants = freezed,Object? hasPassword = null,Object? currentRound = freezed,Object? maxRounds = freezed,}) {
  return _then(_TournamentSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,format: null == format ? _self.format : format // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,timeControl: null == timeControl ? _self._timeControl : timeControl // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,creatorUsername: freezed == creatorUsername ? _self.creatorUsername : creatorUsername // ignore: cast_nullable_to_non_nullable
as String?,currentCount: freezed == currentCount ? _self.currentCount : currentCount // ignore: cast_nullable_to_non_nullable
as int?,maxParticipants: freezed == maxParticipants ? _self.maxParticipants : maxParticipants // ignore: cast_nullable_to_non_nullable
as int?,hasPassword: null == hasPassword ? _self.hasPassword : hasPassword // ignore: cast_nullable_to_non_nullable
as bool,currentRound: freezed == currentRound ? _self.currentRound : currentRound // ignore: cast_nullable_to_non_nullable
as int?,maxRounds: freezed == maxRounds ? _self.maxRounds : maxRounds // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$GameOverInfo {

@JsonKey(name: 'winnerSide') String? get winner;// 'white' | 'black' | 'draw'
 String? get reason;// 'time' | 'resign' | 'goddess_captured' | 'draw'
 String? get winnerId;
/// Create a copy of GameOverInfo
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GameOverInfoCopyWith<GameOverInfo> get copyWith => _$GameOverInfoCopyWithImpl<GameOverInfo>(this as GameOverInfo, _$identity);

  /// Serializes this GameOverInfo to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GameOverInfo&&(identical(other.winner, winner) || other.winner == winner)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.winnerId, winnerId) || other.winnerId == winnerId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,winner,reason,winnerId);

@override
String toString() {
  return 'GameOverInfo(winner: $winner, reason: $reason, winnerId: $winnerId)';
}


}

/// @nodoc
abstract mixin class $GameOverInfoCopyWith<$Res>  {
  factory $GameOverInfoCopyWith(GameOverInfo value, $Res Function(GameOverInfo) _then) = _$GameOverInfoCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'winnerSide') String? winner, String? reason, String? winnerId
});




}
/// @nodoc
class _$GameOverInfoCopyWithImpl<$Res>
    implements $GameOverInfoCopyWith<$Res> {
  _$GameOverInfoCopyWithImpl(this._self, this._then);

  final GameOverInfo _self;
  final $Res Function(GameOverInfo) _then;

/// Create a copy of GameOverInfo
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? winner = freezed,Object? reason = freezed,Object? winnerId = freezed,}) {
  return _then(_self.copyWith(
winner: freezed == winner ? _self.winner : winner // ignore: cast_nullable_to_non_nullable
as String?,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,winnerId: freezed == winnerId ? _self.winnerId : winnerId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [GameOverInfo].
extension GameOverInfoPatterns on GameOverInfo {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _GameOverInfo value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _GameOverInfo() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _GameOverInfo value)  $default,){
final _that = this;
switch (_that) {
case _GameOverInfo():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _GameOverInfo value)?  $default,){
final _that = this;
switch (_that) {
case _GameOverInfo() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'winnerSide')  String? winner,  String? reason,  String? winnerId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _GameOverInfo() when $default != null:
return $default(_that.winner,_that.reason,_that.winnerId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'winnerSide')  String? winner,  String? reason,  String? winnerId)  $default,) {final _that = this;
switch (_that) {
case _GameOverInfo():
return $default(_that.winner,_that.reason,_that.winnerId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'winnerSide')  String? winner,  String? reason,  String? winnerId)?  $default,) {final _that = this;
switch (_that) {
case _GameOverInfo() when $default != null:
return $default(_that.winner,_that.reason,_that.winnerId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _GameOverInfo implements GameOverInfo {
  const _GameOverInfo({@JsonKey(name: 'winnerSide') this.winner, this.reason, this.winnerId});
  factory _GameOverInfo.fromJson(Map<String, dynamic> json) => _$GameOverInfoFromJson(json);

@override@JsonKey(name: 'winnerSide') final  String? winner;
// 'white' | 'black' | 'draw'
@override final  String? reason;
// 'time' | 'resign' | 'goddess_captured' | 'draw'
@override final  String? winnerId;

/// Create a copy of GameOverInfo
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GameOverInfoCopyWith<_GameOverInfo> get copyWith => __$GameOverInfoCopyWithImpl<_GameOverInfo>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GameOverInfoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _GameOverInfo&&(identical(other.winner, winner) || other.winner == winner)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.winnerId, winnerId) || other.winnerId == winnerId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,winner,reason,winnerId);

@override
String toString() {
  return 'GameOverInfo(winner: $winner, reason: $reason, winnerId: $winnerId)';
}


}

/// @nodoc
abstract mixin class _$GameOverInfoCopyWith<$Res> implements $GameOverInfoCopyWith<$Res> {
  factory _$GameOverInfoCopyWith(_GameOverInfo value, $Res Function(_GameOverInfo) _then) = __$GameOverInfoCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'winnerSide') String? winner, String? reason, String? winnerId
});




}
/// @nodoc
class __$GameOverInfoCopyWithImpl<$Res>
    implements _$GameOverInfoCopyWith<$Res> {
  __$GameOverInfoCopyWithImpl(this._self, this._then);

  final _GameOverInfo _self;
  final $Res Function(_GameOverInfo) _then;

/// Create a copy of GameOverInfo
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? winner = freezed,Object? reason = freezed,Object? winnerId = freezed,}) {
  return _then(_GameOverInfo(
winner: freezed == winner ? _self.winner : winner // ignore: cast_nullable_to_non_nullable
as String?,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,winnerId: freezed == winnerId ? _self.winnerId : winnerId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$RatingDelta {

@JsonKey(name: 'whitePlayerId') String get whitePlayerId;@JsonKey(name: 'blackPlayerId') String get blackPlayerId; double? get whiteRating; double? get blackRating; double? get whiteRatingOld; double? get blackRatingOld;
/// Create a copy of RatingDelta
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RatingDeltaCopyWith<RatingDelta> get copyWith => _$RatingDeltaCopyWithImpl<RatingDelta>(this as RatingDelta, _$identity);

  /// Serializes this RatingDelta to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RatingDelta&&(identical(other.whitePlayerId, whitePlayerId) || other.whitePlayerId == whitePlayerId)&&(identical(other.blackPlayerId, blackPlayerId) || other.blackPlayerId == blackPlayerId)&&(identical(other.whiteRating, whiteRating) || other.whiteRating == whiteRating)&&(identical(other.blackRating, blackRating) || other.blackRating == blackRating)&&(identical(other.whiteRatingOld, whiteRatingOld) || other.whiteRatingOld == whiteRatingOld)&&(identical(other.blackRatingOld, blackRatingOld) || other.blackRatingOld == blackRatingOld));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,whitePlayerId,blackPlayerId,whiteRating,blackRating,whiteRatingOld,blackRatingOld);

@override
String toString() {
  return 'RatingDelta(whitePlayerId: $whitePlayerId, blackPlayerId: $blackPlayerId, whiteRating: $whiteRating, blackRating: $blackRating, whiteRatingOld: $whiteRatingOld, blackRatingOld: $blackRatingOld)';
}


}

/// @nodoc
abstract mixin class $RatingDeltaCopyWith<$Res>  {
  factory $RatingDeltaCopyWith(RatingDelta value, $Res Function(RatingDelta) _then) = _$RatingDeltaCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'whitePlayerId') String whitePlayerId,@JsonKey(name: 'blackPlayerId') String blackPlayerId, double? whiteRating, double? blackRating, double? whiteRatingOld, double? blackRatingOld
});




}
/// @nodoc
class _$RatingDeltaCopyWithImpl<$Res>
    implements $RatingDeltaCopyWith<$Res> {
  _$RatingDeltaCopyWithImpl(this._self, this._then);

  final RatingDelta _self;
  final $Res Function(RatingDelta) _then;

/// Create a copy of RatingDelta
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? whitePlayerId = null,Object? blackPlayerId = null,Object? whiteRating = freezed,Object? blackRating = freezed,Object? whiteRatingOld = freezed,Object? blackRatingOld = freezed,}) {
  return _then(_self.copyWith(
whitePlayerId: null == whitePlayerId ? _self.whitePlayerId : whitePlayerId // ignore: cast_nullable_to_non_nullable
as String,blackPlayerId: null == blackPlayerId ? _self.blackPlayerId : blackPlayerId // ignore: cast_nullable_to_non_nullable
as String,whiteRating: freezed == whiteRating ? _self.whiteRating : whiteRating // ignore: cast_nullable_to_non_nullable
as double?,blackRating: freezed == blackRating ? _self.blackRating : blackRating // ignore: cast_nullable_to_non_nullable
as double?,whiteRatingOld: freezed == whiteRatingOld ? _self.whiteRatingOld : whiteRatingOld // ignore: cast_nullable_to_non_nullable
as double?,blackRatingOld: freezed == blackRatingOld ? _self.blackRatingOld : blackRatingOld // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [RatingDelta].
extension RatingDeltaPatterns on RatingDelta {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RatingDelta value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RatingDelta() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RatingDelta value)  $default,){
final _that = this;
switch (_that) {
case _RatingDelta():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RatingDelta value)?  $default,){
final _that = this;
switch (_that) {
case _RatingDelta() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'whitePlayerId')  String whitePlayerId, @JsonKey(name: 'blackPlayerId')  String blackPlayerId,  double? whiteRating,  double? blackRating,  double? whiteRatingOld,  double? blackRatingOld)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RatingDelta() when $default != null:
return $default(_that.whitePlayerId,_that.blackPlayerId,_that.whiteRating,_that.blackRating,_that.whiteRatingOld,_that.blackRatingOld);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'whitePlayerId')  String whitePlayerId, @JsonKey(name: 'blackPlayerId')  String blackPlayerId,  double? whiteRating,  double? blackRating,  double? whiteRatingOld,  double? blackRatingOld)  $default,) {final _that = this;
switch (_that) {
case _RatingDelta():
return $default(_that.whitePlayerId,_that.blackPlayerId,_that.whiteRating,_that.blackRating,_that.whiteRatingOld,_that.blackRatingOld);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'whitePlayerId')  String whitePlayerId, @JsonKey(name: 'blackPlayerId')  String blackPlayerId,  double? whiteRating,  double? blackRating,  double? whiteRatingOld,  double? blackRatingOld)?  $default,) {final _that = this;
switch (_that) {
case _RatingDelta() when $default != null:
return $default(_that.whitePlayerId,_that.blackPlayerId,_that.whiteRating,_that.blackRating,_that.whiteRatingOld,_that.blackRatingOld);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RatingDelta implements RatingDelta {
  const _RatingDelta({@JsonKey(name: 'whitePlayerId') required this.whitePlayerId, @JsonKey(name: 'blackPlayerId') required this.blackPlayerId, this.whiteRating, this.blackRating, this.whiteRatingOld, this.blackRatingOld});
  factory _RatingDelta.fromJson(Map<String, dynamic> json) => _$RatingDeltaFromJson(json);

@override@JsonKey(name: 'whitePlayerId') final  String whitePlayerId;
@override@JsonKey(name: 'blackPlayerId') final  String blackPlayerId;
@override final  double? whiteRating;
@override final  double? blackRating;
@override final  double? whiteRatingOld;
@override final  double? blackRatingOld;

/// Create a copy of RatingDelta
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RatingDeltaCopyWith<_RatingDelta> get copyWith => __$RatingDeltaCopyWithImpl<_RatingDelta>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RatingDeltaToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RatingDelta&&(identical(other.whitePlayerId, whitePlayerId) || other.whitePlayerId == whitePlayerId)&&(identical(other.blackPlayerId, blackPlayerId) || other.blackPlayerId == blackPlayerId)&&(identical(other.whiteRating, whiteRating) || other.whiteRating == whiteRating)&&(identical(other.blackRating, blackRating) || other.blackRating == blackRating)&&(identical(other.whiteRatingOld, whiteRatingOld) || other.whiteRatingOld == whiteRatingOld)&&(identical(other.blackRatingOld, blackRatingOld) || other.blackRatingOld == blackRatingOld));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,whitePlayerId,blackPlayerId,whiteRating,blackRating,whiteRatingOld,blackRatingOld);

@override
String toString() {
  return 'RatingDelta(whitePlayerId: $whitePlayerId, blackPlayerId: $blackPlayerId, whiteRating: $whiteRating, blackRating: $blackRating, whiteRatingOld: $whiteRatingOld, blackRatingOld: $blackRatingOld)';
}


}

/// @nodoc
abstract mixin class _$RatingDeltaCopyWith<$Res> implements $RatingDeltaCopyWith<$Res> {
  factory _$RatingDeltaCopyWith(_RatingDelta value, $Res Function(_RatingDelta) _then) = __$RatingDeltaCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'whitePlayerId') String whitePlayerId,@JsonKey(name: 'blackPlayerId') String blackPlayerId, double? whiteRating, double? blackRating, double? whiteRatingOld, double? blackRatingOld
});




}
/// @nodoc
class __$RatingDeltaCopyWithImpl<$Res>
    implements _$RatingDeltaCopyWith<$Res> {
  __$RatingDeltaCopyWithImpl(this._self, this._then);

  final _RatingDelta _self;
  final $Res Function(_RatingDelta) _then;

/// Create a copy of RatingDelta
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? whitePlayerId = null,Object? blackPlayerId = null,Object? whiteRating = freezed,Object? blackRating = freezed,Object? whiteRatingOld = freezed,Object? blackRatingOld = freezed,}) {
  return _then(_RatingDelta(
whitePlayerId: null == whitePlayerId ? _self.whitePlayerId : whitePlayerId // ignore: cast_nullable_to_non_nullable
as String,blackPlayerId: null == blackPlayerId ? _self.blackPlayerId : blackPlayerId // ignore: cast_nullable_to_non_nullable
as String,whiteRating: freezed == whiteRating ? _self.whiteRating : whiteRating // ignore: cast_nullable_to_non_nullable
as double?,blackRating: freezed == blackRating ? _self.blackRating : blackRating // ignore: cast_nullable_to_non_nullable
as double?,whiteRatingOld: freezed == whiteRatingOld ? _self.whiteRatingOld : whiteRatingOld // ignore: cast_nullable_to_non_nullable
as double?,blackRatingOld: freezed == blackRatingOld ? _self.blackRatingOld : blackRatingOld // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}

// dart format on
