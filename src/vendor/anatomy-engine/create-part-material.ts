import {
  type DataTexture,
  type Color,
  type ColorRepresentation,
  MeshStandardMaterial,
  DoubleSide,
} from "three";

export type PartUniforms = {
  partState: { value: DataTexture };
  selectionState: { value: DataTexture };
  stateWidth: { value: number };
  selectionColor: { value: Color };
  hoverColor: { value: Color };
};

const METALNESS = 0;
const ROUGHNESS = 0.85;
const SELECTION_STRENGTH = 0.22;
const HOVER_RIM_POWER = 2.2;
const HOVER_RIM_STRENGTH = 0.72;
const GHOST_ALPHA = 0.07;
const SURFACE_GHOST_ALPHA = 0.04;

const VERTEX_HEADER = `attribute float partIndex;
uniform sampler2D partState;
uniform sampler2D selectionState;
uniform float stateWidth;
varying float vPartVisible;
varying float vPartSelected;
varying float vPartHovered;
varying float vPartGhosted;
varying vec3 vAnatomyView;
`;

const VERTEX_STATE = `#include <begin_vertex>
vec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5);
vec4 partOffset = texture2D(partState, stateUv);
transformed += partOffset.xyz;
vPartVisible = partOffset.w;
vec4 partSelection = texture2D(selectionState, stateUv);
vPartSelected = partSelection.r;
vPartHovered = partSelection.g;
vPartGhosted = partSelection.b;`;

const VERTEX_VIEW = `#include <fog_vertex>
vAnatomyView = normalize(-mvPosition.xyz);`;

const FRAGMENT_HEADER = `uniform vec3 selectionColor;
uniform vec3 hoverColor;
varying float vPartVisible;
varying float vPartSelected;
varying float vPartHovered;
varying float vPartGhosted;
varying vec3 vAnatomyView;
`;

const FRAGMENT_VISIBILITY = `#include <clipping_planes_fragment>
if (vPartVisible < 0.01) discard;`;

function fragmentColor(ghostAlpha: number) {
  return `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, selectionColor, vPartSelected * ${glsl(SELECTION_STRENGTH)});
float rim = pow(1.0 - max(0.0, dot(normalize(vNormal), vAnatomyView)), ${glsl(HOVER_RIM_POWER)});
diffuseColor.rgb = mix(diffuseColor.rgb, hoverColor, rim * ${glsl(HOVER_RIM_STRENGTH)} * vPartHovered);
if (vPartGhosted > 0.5 && vPartSelected < 0.5) {
  diffuseColor.a = ${glsl(ghostAlpha)};
}`;
}

function glsl(value: number) {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export default function createPartMaterial(
  color: ColorRepresentation,
  surface: boolean,
  uniforms: PartUniforms,
) {
  const material = new MeshStandardMaterial({
    color,
    vertexColors: true,
    envMapIntensity: 0.35,
    metalness: METALNESS,
    roughness: ROUGHNESS,
    side: DoubleSide,
    transparent: true,
    depthWrite: !surface,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = (VERTEX_HEADER + shader.vertexShader)
      .replace("#include <begin_vertex>", VERTEX_STATE)
      .replace("#include <fog_vertex>", VERTEX_VIEW);

    shader.fragmentShader = (FRAGMENT_HEADER + shader.fragmentShader)
      .replace("#include <clipping_planes_fragment>", FRAGMENT_VISIBILITY)
      .replace(
        "#include <color_fragment>",
        fragmentColor(surface ? SURFACE_GHOST_ALPHA : GHOST_ALPHA),
      );
  };

  return material;
}
