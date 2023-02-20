#version 410 core

in vec3 fPosition;
in vec3 fNormal;
in vec4 fragPosLightSpace;
in vec2 fTexCoords;

out vec4 fColor;

//matrices
uniform mat4 model;
uniform mat4 view;
uniform mat3 normalMatrix;
//lighting
uniform vec3 lightDir;
uniform vec3 lightColor;

uniform int fog;

// textures
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

//components
vec3 ambient;
float ambientStrength = 0.2f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;

void computeDirLight()
{
    //compute eye space coordinates
    vec4 fPosEye = view * model * vec4(fPosition, 1.0f);
    vec3 normalEye = normalize(normalMatrix * fNormal);

    //normalize light direction
    vec3 lightDirN = vec3(normalize(view * vec4(lightDir, 0.0f)));

    //compute view direction (in eye coordinates, the viewer is situated at the origin
    vec3 viewDir = normalize(- fPosEye.xyz);

    //compute ambient light
    ambient = ambientStrength * lightColor;

    //compute diffuse light
    diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;

    //compute specular light
    vec3 reflectDir = reflect(-lightDirN, normalEye);
    float specCoeff = pow(max(dot(viewDir, reflectDir), 0.0f), 32);
    specular = specularStrength * specCoeff * lightColor;
}

float computeFog()
{
	vec4 fPosEye = view * model * vec4(fPosition, 1.0f);
	float fogDensity = 0.2f;
	float fragmentDistance = length(fPosEye);
	float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2));

	return clamp(fogFactor, 0.0f, 1.0f);
}

float computeShadow()
{	
	// perform perspective divide
    vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    if(normalizedCoords.z > 1.0f)
        return 0.0f;
    // Transform to [0,1] range
    normalizedCoords = normalizedCoords * 0.5f + 0.5f;
    // Get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(shadowMap, normalizedCoords.xy).r;    
    // Get depth of current fragment from light's perspective
    float currentDepth = normalizedCoords.z;
    // Check whether current frag pos is in shadow
    float bias = 0.005f;
    float shadow = currentDepth - bias > closestDepth  ? 1.0f : 0.0f;

    return shadow;	
}

void main() 
{
    computeDirLight();
	
	float shadow = computeShadow();

    //compute final vertex color
    vec3 color = min((ambient + diffuse * (1 - shadow)) * texture(diffuseTexture, fTexCoords).rgb + specular * (1 - shadow) * texture(specularTexture, fTexCoords).rgb, 1.0f);
    //vec3 color = min((ambient + diffuse) * texture(diffuseTexture, fTexCoords).rgb + specular * texture(specularTexture, fTexCoords).rgb, 1.0f);
	
	if (fog == 1)
	{
		float fogFactor = computeFog();
		vec4 fogColor = vec4(0.0f, 0.0f, 0.0f, 1.0f);
        vec4 colorF = vec4(color,1.0f);
		//fColor = mix(fogColor, color, fogFactor);
		fColor = fogColor * (1 - fogFactor) + colorF * fogFactor;
	}
	else
		fColor = vec4(color, 1.0f);

    //fColor = vec4(color, 1.0f);
}
