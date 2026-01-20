Name:           demoscript
Version:        1.0.0
Release:        1%{?dist}
Summary:        Framework for scripted, shareable product demonstrations

License:        MIT
URL:            https://github.com/aximcode/demoscript
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  nodejs >= 18
BuildRequires:  npm
Requires:       nodejs >= 18
Recommends:     chromium
Recommends:     ffmpeg

BuildArch:      noarch

%description
DemoScript is a framework for creating scripted, shareable product
demonstrations. Write YAML files to define demo steps, and the framework
provides a polished web UI for presenting and sharing demos.

Features include REST API demos, shell commands, browser automation,
variable chaining, branching flows, and static site export.

%prep
%setup -q

%build
# Install all dependencies (dev deps needed for build)
npm ci
# Build UI first
npm run build --workspace=packages/ui
# Bundle CLI with esbuild (puppeteer-core is bundled, no external node_modules needed)
npm run bundle --workspace=packages/cli

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}%{_libdir}/%{name}
mkdir -p %{buildroot}%{_bindir}

# Copy bundled CLI distribution (all deps are bundled)
cp packages/cli/dist/index.js %{buildroot}%{_libdir}/%{name}/
cp packages/cli/dist/bundle.cjs %{buildroot}%{_libdir}/%{name}/
cp -r packages/cli/dist/ui-dist %{buildroot}%{_libdir}/%{name}/

# Copy schema file for validation
cp demo.schema.json %{buildroot}%{_libdir}/%{name}/

# Create wrapper script
cat > %{buildroot}%{_bindir}/%{name} << 'EOF'
#!/bin/bash
exec node %{_libdir}/demoscript/index.js "$@"
EOF
chmod 755 %{buildroot}%{_bindir}/%{name}

%files
%license LICENSE
%doc README.md
%{_libdir}/%{name}
%{_bindir}/%{name}

%changelog
* Sun Jan 12 2025 Mike Gosha <mike@example.com> - 1.0.0-1
- Initial package
