#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { PACKAGES } = require("../config/paths.config");

/**
 * Component Generator
 * Creates components with tests and stories based on package type
 */

const COMPONENT_TEMPLATES = {
  vue: {
    component: (name, props) => `<template>
  <div class="${name.toLowerCase()}">
    <h2 v-if="title">{{ title }}</h2>
    <div class="${name.toLowerCase()}__content">
      <slot>Default content for ${name}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ${name}Props {
  title?: string;
  ${props.map((prop) => `${prop.name}?: ${prop.type};`).join("\n  ")}
}

withDefaults(defineProps<${name}Props>(), {
  title: '',
  ${props.map((prop) => `${prop.name}: ${prop.default || `undefined`},`).join("\n  ")}
});

const emit = defineEmits<{
  click: [event: MouseEvent];
  ${props
    .filter((p) => p.event)
    .map((prop) => `${prop.event}: [value: ${prop.type}];`)
    .join("\n  ")}
}>();

// Component logic here
</script>

<style scoped>
.${name.toLowerCase()} {
  /* Component styles */
}

.${name.toLowerCase()}__content {
  /* Content styles */
}
</style>`,

    test: (name) => `import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ${name} from './${name}.vue';

describe('${name}', () => {
  it('renders properly', () => {
    const wrapper = mount(${name}, {
      props: {
        title: 'Test Title',
      },
    });

    expect(wrapper.text()).toContain('Test Title');
  });

  it('emits click event', async () => {
    const wrapper = mount(${name});
    
    await wrapper.trigger('click');
    
    expect(wrapper.emitted().click).toBeTruthy();
  });

  it('renders slot content', () => {
    const wrapper = mount(${name}, {
      slots: {
        default: '<span>Custom content</span>',
      },
    });

    expect(wrapper.html()).toContain('Custom content');
  });
});`,

    story: (name) => `import type { Meta, StoryObj } from '@storybook/vue3';
import ${name} from './${name}.vue';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '${name} Component',
  },
};

export const WithoutTitle: Story = {
  args: {
    title: '',
  },
};

export const Interactive: Story = {
  args: {
    title: 'Interactive ${name}',
  },
  play: async ({ canvasElement }) => {
    // Add interactions here
  },
};`,
  },

  react: {
    component: (name, props) => `import React from 'react';
import { cn } from '@/utils/cn';

interface ${name}Props {
  className?: string;
  title?: string;
  ${props.map((prop) => `${prop.name}?: ${prop.type};`).join("\n  ")}
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({
  className,
  title,
  ${props.map((prop) => prop.name).join(",\n  ")},
  children,
  ...props
}) => {
  return (
    <div 
      className={cn('${name.toLowerCase()}', className)}
      {...props}
    >
      {title && <h2 className="${name.toLowerCase()}__title">{title}</h2>}
      <div className="${name.toLowerCase()}__content">
        {children || 'Default content for ${name}'}
      </div>
    </div>
  );
};

export default ${name};`,

    test: (
      name,
    ) => `import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders with title', () => {
    render(<${name} title="Test Title" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <${name}>
        <span>Custom content</span>
      </${name}>
    );
    
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<${name} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});`,

    story: (name) => `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '${name} Component',
    children: 'Default content',
  },
};

export const WithoutTitle: Story = {
  args: {
    children: 'Content without title',
  },
};`,
  },
};

/**
 * Generate a component with tests and stories
 * @param {string} packageName Package name where component should be created
 * @param {string} componentName Component name
 * @param {Object} options Generation options
 */
function generateComponent(packageName, componentName, options = {}) {
  const {
    props = [],
    withTest = true,
    withStory = true,
    outputDir = "src/components",
  } = options;

  if (!PACKAGES[packageName]) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  // Determine component type based on package
  const componentType =
    packageName === "web-app"
      ? "vue"
      : packageName === "mobile-app"
        ? "react"
        : "vue";

  const packageDir = PACKAGES[packageName];
  const componentDir = path.resolve(packageDir, outputDir, componentName);

  // Create component directory
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
  }

  const templates = COMPONENT_TEMPLATES[componentType];

  // Generate component file
  const componentExt =
    componentType === "vue"
      ? ".vue"
      : componentType === "react"
        ? ".tsx"
        : ".ts";
  const componentPath = path.resolve(
    componentDir,
    `${componentName}${componentExt}`,
  );
  fs.writeFileSync(componentPath, templates.component(componentName, props));
  console.log(`✓ Created ${componentName}${componentExt}`);

  // Generate test file
  if (withTest) {
    const testExt = componentType === "vue" ? ".spec.ts" : ".test.tsx";
    const testPath = path.resolve(componentDir, `${componentName}${testExt}`);
    fs.writeFileSync(testPath, templates.test(componentName));
    console.log(`✓ Created ${componentName}${testExt}`);
  }

  // Generate story file
  if (withStory) {
    const storyPath = path.resolve(componentDir, `${componentName}.stories.ts`);
    fs.writeFileSync(storyPath, templates.story(componentName));
    console.log(`✓ Created ${componentName}.stories.ts`);
  }

  // Generate index file for easier imports
  const indexPath = path.resolve(componentDir, "index.ts");
  const indexContent =
    componentType === "vue"
      ? `export { default as ${componentName} } from './${componentName}.vue';`
      : `export { ${componentName} } from './${componentName}';`;
  fs.writeFileSync(indexPath, indexContent);
  console.log(`✓ Created index.ts`);

  console.log(
    `\n✅ Component ${componentName} generated successfully in ${packageName}!`,
  );
  console.log(`   Location: ${componentDir}`);
  console.log(
    `   Import: import { ${componentName} } from '@/components/${componentName}';`,
  );
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const [packageName, componentName, ...propArgs] = args;

  if (!packageName || !componentName) {
    console.log(`
Usage: node component.generator.js <package-name> <component-name> [props...]

Arguments:
  package-name     Name of the package where component should be created
                   Available: ${Object.keys(PACKAGES).join(", ")}
  component-name   Name of the component (PascalCase)
  props           Optional props in format: name:type:default

Options:
  --no-test       Skip test file generation
  --no-story      Skip story file generation
  --dir <path>    Custom output directory (default: src/components)

Examples:
  node component.generator.js web-app Button
  node component.generator.js web-app UserCard name:string title:string:""
  node component.generator.js mobile-app ProfileScreen --dir src/screens
`);
    process.exit(1);
  }

  // Parse props
  const props = propArgs
    .filter((arg) => !arg.startsWith("--"))
    .map((prop) => {
      const [name, type = "string", defaultValue] = prop.split(":");
      return { name, type, default: defaultValue };
    });

  const options = {
    props,
    withTest: !args.includes("--no-test"),
    withStory: !args.includes("--no-story"),
    outputDir: args.includes("--dir")
      ? args[args.indexOf("--dir") + 1]
      : "src/components",
  };

  try {
    generateComponent(packageName, componentName, options);
  } catch (error) {
    console.error("❌ Error generating component:", error.message);
    process.exit(1);
  }
}

module.exports = {
  generateComponent,
  COMPONENT_TEMPLATES,
};
