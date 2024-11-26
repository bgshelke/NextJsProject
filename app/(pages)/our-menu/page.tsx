
import React from 'react'
import OurMenu from './OurMenu';
// import OurMenu from './OurMenu';

export const metadata = {
  title: "Our Menu",
  description: "Our Menu",
};

function Page() {
  return (
    <div className='px-4 md:px-0'>
      <OurMenu />
    </div>
  )
}

export default Page